import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";

/**
 * Full NextAuth instance (server-only: providers + prisma + bcrypt).
 *
 * - Credentials: email/password for both admins/authors AND public users.
 *   (The old `role !== ADMIN/AUTHOR` gate is lifted so public USERs can log in;
 *   admin protection now rests on requireAdmin() + the /admin middleware.)
 * - Google: OAuth for fast public sign-in. PrismaAdapter persists Google users
 *   into the User table so they can own posts/follows. Session strategy stays
 *   "jwt" (Credentials requires it) — the adapter is only used for user/account
 *   persistence, not sessions.
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    // Runs in the Node runtime (sign-in / session refresh). Ensures every token
    // carries role + username, reading them from the DB for OAuth users whose
    // adapter record doesn't include those fields.
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = (user as { id: string }).id;
        const role = (user as { role?: string }).role;
        if (role) token.role = role;
      }
      // Backfill role/username from DB when missing (Google sign-in) or on update.
      if (token.id && (!token.role || token.username === undefined || trigger === "update")) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, username: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.username = dbUser.username ?? null;
        }
      }
      return token;
    },
  },
  // Cast: PrismaAdapter is typed against @prisma/client; our client is generated
  // to src/generated/prisma but is structurally identical.
  adapter: PrismaAdapter(prisma) as unknown as import("next-auth").NextAuthConfig["adapter"],
  providers: [
    // Only register Google when real credentials exist — otherwise an init-time
    // validation could throw and take down the existing (working) admin login.
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true, // link Google to an existing email-matched user
          }),
        ]
      : []),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (creds) => {
        const email = typeof creds?.email === "string" ? creds.email.trim().toLowerCase() : "";
        const password = typeof creds?.password === "string" ? creds.password : "";
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.password) return null;

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return null;

        // No role gate: USER / AUTHOR / ADMIN may all sign in. Admin areas are
        // protected separately by requireAdmin() and src/proxy.ts.
        return { id: user.id, email: user.email, role: user.role };
      },
    }),
  ],
});

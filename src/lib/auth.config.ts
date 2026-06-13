import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth config — no providers, no bcrypt, no prisma.
 * Used by src/proxy.ts (Next 16 middleware) so it can run on the edge runtime.
 * The full config in src/lib/auth.ts spreads this and adds the Credentials provider.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/login" },
  trustHost: true,
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      // Edge-safe: only copies fields off the user object. Role/username
      // enrichment for OAuth users (which need a DB read) happens in the
      // full instance's jwt callback in src/lib/auth.ts.
      if (user) {
        token.id = (user as { id: string }).id;
        const role = (user as { role?: string }).role;
        if (role) token.role = role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { username?: string | null }).username =
          (token.username as string | null) ?? null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

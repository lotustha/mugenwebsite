import { auth } from "@/lib/auth";
import { verifyMobileToken } from "@/lib/mobile-token";

export interface AuthUser {
  id: string;
  email: string;
  role: "ADMIN" | "AUTHOR" | "USER";
}

/**
 * Returns the signed-in admin/author, or null if unauthenticated or unauthorized.
 * Drop-in replacement for the old supabase.auth.getUser() pattern in admin API routes.
 * The id is the prisma User.id (same as the session token), so it can be used
 * directly as a foreign key (e.g., uploaderId, authorId).
 */
export async function requireAdmin(): Promise<AuthUser | null> {
  const session = await auth();
  const u = session?.user as { id?: string; email?: string; role?: string } | undefined;
  if (!u?.id || !u.email) return null;
  if (u.role !== "ADMIN" && u.role !== "AUTHOR") return null;
  return { id: u.id, email: u.email, role: u.role as AuthUser["role"] };
}

/**
 * Returns ANY signed-in user (USER/AUTHOR/ADMIN), for social features.
 *
 * Dual-client: web sends a NextAuth cookie session; the mobile app sends
 * `Authorization: Bearer <token>` (issued by /api/auth/mobile/*). Pass the
 * Request so the bearer path can be checked; it falls back to the cookie session.
 */
export async function getSessionUser(req?: Request): Promise<AuthUser | null> {
  // 1. Mobile bearer token (no cookie).
  const authz = req?.headers.get("authorization") ?? req?.headers.get("Authorization");
  if (authz?.startsWith("Bearer ")) {
    const payload = verifyMobileToken(authz.slice(7).trim());
    if (payload) {
      return { id: payload.id, email: payload.email, role: payload.role };
    }
  }
  // 2. Web cookie session.
  const session = await auth();
  const u = session?.user as { id?: string; email?: string; role?: string } | undefined;
  if (!u?.id || !u.email) return null;
  return { id: u.id, email: u.email, role: (u.role as AuthUser["role"]) ?? "USER" };
}

/** Like getSessionUser but returns a 401 Response when unauthenticated. */
export async function requireUser(
  req?: Request,
): Promise<{ user: AuthUser } | { error: Response }> {
  const user = await getSessionUser(req);
  if (!user) {
    return {
      error: new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    };
  }
  return { user };
}

import { auth } from "@/lib/auth";

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

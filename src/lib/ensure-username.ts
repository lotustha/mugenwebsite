import { prisma } from "@/lib/prisma";
import { suggestUsername } from "@/lib/username";

/**
 * Generate a unique social handle from a seed (email or display name).
 * Used to backfill `username` for OAuth users created via the PrismaAdapter,
 * which doesn't know about our custom `username` column.
 */
export async function generateUniqueUsername(seed: string): Promise<string> {
  const base = suggestUsername(seed);
  let candidate = base;
  for (let i = 0; i < 50; i++) {
    const taken = await prisma.user.findUnique({
      where: { username: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
    candidate = `${base}${Math.floor(10 + Math.random() * 89)}`.slice(0, 20);
  }
  // Extremely unlikely collision fallback.
  return `${base}${Date.now().toString(36)}`.slice(0, 20);
}

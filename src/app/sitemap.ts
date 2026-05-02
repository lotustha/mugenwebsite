import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://mugenanime.com").replace(/\/$/, "");

// ─── Static routes ─────────────────────────────────────────────────────────────
const STATIC: MetadataRoute.Sitemap = [
  { url: SITE,                        priority: 1.0, changeFrequency: "daily",   lastModified: new Date() },
  { url: `${SITE}/anime`,             priority: 0.9, changeFrequency: "hourly",  lastModified: new Date() },
  { url: `${SITE}/wallpapers`,        priority: 0.8, changeFrequency: "daily",   lastModified: new Date() },
  { url: `${SITE}/news`,              priority: 0.8, changeFrequency: "hourly",  lastModified: new Date() },
  { url: `${SITE}/apps`,              priority: 0.7, changeFrequency: "weekly",  lastModified: new Date() },
  { url: `${SITE}/support`,           priority: 0.4, changeFrequency: "monthly", lastModified: new Date() },
  { url: `${SITE}/privacy-policy`,    priority: 0.3, changeFrequency: "yearly",  lastModified: new Date() },
  { url: `${SITE}/terms-of-service`,  priority: 0.3, changeFrequency: "yearly",  lastModified: new Date() },
];

// ─── Main sitemap ───────────────────────────────────────────────────────────────
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {

  const [posts, apps, wallpapers] = await Promise.allSettled([
    // Published news posts
    prisma.post.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 10_000,
    }),
    // Published apps
    prisma.app.findMany({
      where: { published: true },
      select: { id: true, slug: true, updatedAt: true, privacyPolicy: true },
    }),
    // Wallpapers (newest first, capped at 50 000 — sitemap limit)
    prisma.wallpaper.findMany({
      select: { id: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 50_000,
    }),
  ]);

  // ── News / posts ──────────────────────────────────────────────────────────────
  const postRoutes: MetadataRoute.Sitemap =
    posts.status === "fulfilled"
      ? posts.value.map(p => ({
          url: `${SITE}/news/${p.slug}`,
          lastModified: p.updatedAt,
          changeFrequency: "monthly" as const,
          priority: 0.7,
        }))
      : [];

  // ── Apps ──────────────────────────────────────────────────────────────────────
  const appRoutes: MetadataRoute.Sitemap =
    apps.status === "fulfilled"
      ? apps.value.flatMap(a => {
          const slug = a.slug ?? a.id;
          const rows: MetadataRoute.Sitemap = [
            {
              url: `${SITE}/apps/${slug}`,
              lastModified: a.updatedAt,
              changeFrequency: "monthly" as const,
              priority: 0.8,
            },
          ];
          if (a.privacyPolicy) {
            rows.push({
              url: `${SITE}/apps/${slug}/privacy-policy`,
              lastModified: a.updatedAt,
              changeFrequency: "yearly" as const,
              priority: 0.2,
            });
          }
          return rows;
        })
      : [];

  // ── Wallpapers ────────────────────────────────────────────────────────────────
  const wallpaperRoutes: MetadataRoute.Sitemap =
    wallpapers.status === "fulfilled"
      ? wallpapers.value.map(w => ({
          url: `${SITE}/wallpapers/${w.id}`,
          lastModified: w.createdAt,
          changeFrequency: "never" as const,
          priority: 0.5,
        }))
      : [];

  return [
    ...STATIC,
    ...postRoutes,
    ...appRoutes,
    ...wallpaperRoutes,
  ];
}

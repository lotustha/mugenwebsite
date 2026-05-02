import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import WallpaperVideoPlayer from "./WallpaperVideoPlayer";
import RelatedWallpapers from "./RelatedWallpapers";

interface PageProps {
  params: Promise<{ id: string }>;
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "";

async function getWallpaper(id: string) {
  try {
    return await (prisma.wallpaper as any).findUnique({
      where: { id },
      include: {
        categories: { select: { id: true, name: true, slug: true } },
        tags: { select: { id: true, name: true, slug: true } },
      },
    });
  } catch {
    const w = await prisma.wallpaper.findUnique({ where: { id } });
    return w ? { ...w, categories: [], tags: [] } : null;
  }
}

async function getRelated(wallpaperId: string, categories: any[], tags: any[]) {
  const cat = categories?.[0]?.slug;
  const tag = tags?.[0]?.slug;
  const base: any = { id: { not: wallpaperId } };
  if (cat) base.categories = { some: { slug: cat } };
  else if (tag) base.tags = { some: { slug: tag } };
  try {
    return await (prisma.wallpaper as any).findMany({
      where: base,
      take: 7,
      orderBy: { downloadsCount: "desc" },
      select: { id: true, title: true, fileUrl: true, type: true, downloadsCount: true },
    });
  } catch {
    return prisma.wallpaper.findMany({
      where: { id: { not: wallpaperId } },
      take: 7,
      select: { id: true, title: true, fileUrl: true, type: true, downloadsCount: true },
    });
  }
}

// ─── Metadata ──────────────────────────────────────────────────────────────────
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const w = await getWallpaper(id);
  if (!w) return { title: "Not Found" };

  const isVideo = w.type === "VIDEO";
  const description = w.description
    ?? `Download ${w.title} ${isVideo ? "live " : ""}wallpaper for free on MugenAnime.`;
  const canonical = `${SITE}/wallpapers/${id}`;
  const ogImage = !isVideo ? { url: w.fileUrl, alt: w.title, width: 1080, height: 1920 } : null;

  return {
    title: `${w.title} — Free ${isVideo ? "Live " : ""}Wallpaper | MugenAnime`,
    description,
    alternates: { canonical },
    openGraph: {
      title: w.title,
      description,
      url: canonical,
      siteName: "MugenAnime",
      type: "website",
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title: w.title,
      description,
      ...(ogImage ? { images: [ogImage.url] } : {}),
    },
  };
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default async function WallpaperDetailPage({ params }: PageProps) {
  const { id } = await params;
  const wallpaper = await getWallpaper(id);
  if (!wallpaper) notFound();

  // Fire-and-forget view count increment
  prisma.wallpaper.update({ where: { id }, data: { downloadsCount: { increment: 1 } } }).catch(() => {});

  const related = await getRelated(id, wallpaper.categories, wallpaper.tags);

  const isVideo    = wallpaper.type === "VIDEO";
  const categories: any[] = wallpaper.categories ?? [];
  const tags: any[]       = wallpaper.tags ?? [];
  const relatedLabel = categories.length > 0 ? `More · ${categories[0].name}` : "More Wallpapers";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    name: wallpaper.title,
    description: wallpaper.description ?? `Download ${wallpaper.title} wallpaper`,
    contentUrl: wallpaper.fileUrl,
    ...(isVideo ? {} : { thumbnailUrl: wallpaper.fileUrl }),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 lg:gap-10">

            {/* ── Column 1: portrait media ── */}
            <div className="lg:sticky lg:top-24 lg:self-start">
              <div className="mx-auto w-full max-w-[320px] lg:max-w-none relative aspect-[9/16] rounded-3xl overflow-hidden"
                style={{ background: "rgba(6,14,32,0.8)", boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)" }}>
                {isVideo ? (
                  <WallpaperVideoPlayer fileUrl={wallpaper.fileUrl} />
                ) : (
                  <Image src={wallpaper.fileUrl} alt={wallpaper.title} fill
                    sizes="(max-width: 1024px) 320px, 320px"
                    className="object-cover" priority />
                )}
              </div>
            </div>

            {/* ── Column 2: info ── */}
            <div className="flex flex-col gap-5 pt-1 min-w-0">

              <Link href="/wallpapers"
                className="inline-flex items-center gap-2 text-sm cursor-pointer transition-colors group w-fit"
                style={{ color: "rgba(222,229,255,0.38)" }}>
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 transition-transform duration-150 group-hover:-translate-x-0.5">
                  <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
                </svg>
                <span className="font-body hover:text-text-main/60 transition-colors">All Wallpapers</span>
              </Link>

              <div className="space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-body text-xs font-semibold"
                    style={{
                      background: isVideo ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.06)",
                      color: isVideo ? "#c4b5fd" : "rgba(222,229,255,0.5)",
                      border: `1px solid ${isVideo ? "rgba(139,92,246,0.35)" : "rgba(255,255,255,0.08)"}`,
                    }}>
                    {isVideo
                      ? <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3"><path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h7A1.5 1.5 0 0 1 13 3.5v9A1.5 1.5 0 0 1 11.5 14h-7A1.5 1.5 0 0 1 3 12.5v-9Zm8.5 4.243V8l-3-1.757v3.514L11.5 8z" /></svg>
                      : <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M2 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4Zm9.5 6.5-3-2.5-1.5 1.5-2-2.5-2 3H12l-.5-1.5Z" clipRule="evenodd" /></svg>
                    }
                    {isVideo ? "Live Wallpaper" : "Image Wallpaper"}
                  </span>
                  {(wallpaper.downloadsCount ?? 0) > 0 && (
                    <span className="font-body text-xs flex items-center gap-1" style={{ color: "rgba(222,229,255,0.28)" }}>
                      <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                        <path d="M8.75 2.75a.75.75 0 0 0-1.5 0v5.69L5.03 6.22a.75.75 0 0 0-1.06 1.06l3.5 3.5a.75.75 0 0 0 1.06 0l3.5-3.5a.75.75 0 0 0-1.06-1.06L8.75 8.44V2.75Z" />
                        <path d="M3.5 9.75a.75.75 0 0 0-1.5 0v1.5A2.75 2.75 0 0 0 4.75 14h6.5A2.75 2.75 0 0 0 14 11.25v-1.5a.75.75 0 0 0-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-1.5Z" />
                      </svg>
                      {wallpaper.downloadsCount.toLocaleString()} downloads
                    </span>
                  )}
                </div>

                <h1 className="font-headline text-2xl sm:text-3xl font-bold text-text-main leading-tight">
                  {wallpaper.title}
                </h1>

                {wallpaper.description && (
                  <p className="font-body text-sm leading-relaxed" style={{ color: "rgba(222,229,255,0.5)" }}>
                    {wallpaper.description}
                  </p>
                )}
              </div>

              {categories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {categories.map((c: any) => (
                    <Link key={c.id} href={`/wallpapers?category=${c.slug}`}
                      className="px-3 py-1.5 rounded-full font-body text-xs font-medium cursor-pointer transition-all duration-150 hover:brightness-125"
                      style={{ background: "rgba(139,92,246,0.13)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.25)" }}>
                      {c.name}
                    </Link>
                  ))}
                </div>
              )}

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t: any) => (
                    <span key={t.id} className="px-2.5 py-1 rounded-lg font-body text-[0.6875rem]"
                      style={{ background: "rgba(255,255,255,0.04)", color: "rgba(222,229,255,0.38)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      #{t.name}
                    </span>
                  ))}
                </div>
              )}

              <div style={{ height: "1px", background: "rgba(255,255,255,0.06)" }} />

              <a href={wallpaper.fileUrl} download target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-headline text-base font-bold cursor-pointer transition-all duration-200 hover:brightness-110 hover:shadow-lg active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg,#8B5CF6,#D946EF)", color: "white", boxShadow: "0 8px 32px rgba(139,92,246,0.35)" }}>
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                  <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
                </svg>
                Free Download
              </a>

              <div className="flex justify-end">
                <Link href="/dmca" className="font-body text-xs transition-colors hover:text-text-main/50"
                  style={{ color: "rgba(222,229,255,0.2)" }}>
                  Report copyright
                </Link>
              </div>

              <RelatedWallpapers items={related} label={relatedLabel} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

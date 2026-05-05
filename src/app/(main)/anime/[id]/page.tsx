import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getAnimeInfo } from "@/lib/api";
import AnimeEpisodeList from "@/components/AnimeEpisodeList";
import AdUnit from "@/components/AdUnit";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "";

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { t }  = await searchParams;
  const canonical = `${SITE}/anime/${id}`;

  if (t) {
    const title = decodeURIComponent(t);
    return {
      title: `${title} — Watch on MugenAnime`,
      description: `Watch ${title} in HD, sub & dub, for free on the MugenAnime app.`,
      alternates: { canonical },
    };
  }

  const anime = await getAnimeInfo(id);
  if (!anime) return { title: "Anime Not Found" };

  const title       = anime.title ?? anime.name ?? "Anime";
  const description = (anime.description ?? anime.synopsis ?? `Watch ${title} in HD for free on MugenAnime.`).slice(0, 160);
  const ogImage     = anime.image ?? anime.poster ?? null;

  return {
    title: `${title} — Watch Free HD | MugenAnime`,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, siteName: "MugenAnime", type: "video.tv_show",
      ...(ogImage ? { images: [{ url: ogImage, alt: title }] } : {}) },
    twitter: { card: ogImage ? "summary_large_image" : "summary", title, description,
      ...(ogImage ? { images: [ogImage] } : {}) },
  };
}

export default async function AnimePage({ params }: PageProps) {
  const { id } = await params;
  const anime  = await getAnimeInfo(id);
  if (!anime) notFound();

  const title         = anime.title ?? anime.name ?? "";
  const poster        = anime.image ?? anime.poster ?? "";
  const cover         = anime.cover ?? poster;
  const description   = anime.description ?? anime.synopsis ?? "";
  const episodes: any[]    = anime.episodes ?? [];
  const genres: string[]   = anime.genres ?? [];
  const isOngoing = anime.status === "Ongoing" || anime.status === "Releasing";

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@type": "TVSeries",
        name: title, description: description || undefined,
        ...(poster ? { image: poster } : {}),
        ...(genres.length ? { genre: genres } : {}),
        url: `${SITE}/anime/${id}`,
      })}} />

      <div className="min-h-screen bg-background">

        {/* ── Hero — full bleed on mobile ── */}
        <div className="relative w-full" style={{ height: "clamp(300px, 55vw, 480px)" }}>
          {/* Background cover */}
          {cover && (
            <Image src={cover} alt={title} fill sizes="100vw"
              className="object-cover" priority />
          )}
          {/* Gradient overlays */}
          <div className="absolute inset-0"
            style={{ background: "linear-gradient(to bottom, rgba(7,4,20,0.1) 0%, rgba(7,4,20,0.5) 55%, rgba(7,4,20,1) 100%)" }} />
          <div className="absolute inset-0"
            style={{ background: "linear-gradient(to right, rgba(7,4,20,0.7) 0%, transparent 50%)" }} />

          {/* Back button */}
          <Link href="/anime"
            className="absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all active:scale-95"
            style={{ background: "rgba(7,4,20,0.6)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-white">
              <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
            </svg>
          </Link>

          {/* Status badge */}
          {anime.status && (
            <div className="absolute top-4 right-4">
              <span className="font-body text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{
                  background: isOngoing ? "rgba(52,211,153,0.2)" : "rgba(139,92,246,0.2)",
                  color:      isOngoing ? "#34d399"              : "#c4b5fd",
                  border:     `1px solid ${isOngoing ? "rgba(52,211,153,0.4)" : "rgba(139,92,246,0.4)"}`,
                  backdropFilter: "blur(8px)",
                }}>
                {anime.status}
              </span>
            </div>
          )}

          {/* Poster + title — bottom of hero */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-5 flex items-end gap-4">
            {/* Poster */}
            {poster && (
              <div className="flex-none rounded-xl overflow-hidden shadow-2xl"
                style={{
                  width: "clamp(72px, 18vw, 120px)",
                  aspectRatio: "2/3",
                  border: "2px solid rgba(255,255,255,0.12)",
                  boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
                  flexShrink: 0,
                }}>
                <Image src={poster} alt={title} width={120} height={180}
                  className="w-full h-full object-cover" />
              </div>
            )}
            {/* Title + meta */}
            <div className="flex-1 min-w-0 pb-1">
              <h1 className="font-headline font-bold text-white leading-tight"
                style={{ fontSize: "clamp(1.1rem, 4vw, 2rem)" }}>
                {title}
              </h1>
              {episodes.length > 0 && (
                <p className="font-body text-xs mt-1" style={{ color: "rgba(222,229,255,0.5)" }}>
                  {episodes.length} episode{episodes.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Info body ── */}
        <div className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">

          {/* Genres — horizontal scroll */}
          {genres.length > 0 && (
            <div className="flex gap-2 overflow-x-auto py-4 scrollbar-none">
              {genres.map((g, i) => (
                <span key={i} className="flex-none px-3 py-1.5 rounded-full font-body text-xs font-medium whitespace-nowrap"
                  style={{ background: "rgba(139,92,246,0.12)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.25)" }}>
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* Synopsis */}
          {description && (
            <div className="mb-5">
              <p className="font-body text-sm leading-relaxed" style={{ color: "rgba(222,229,255,0.65)" }}>
                {description}
              </p>
            </div>
          )}

          {/* Ad — between synopsis and app CTA */}
          <AdUnit slot="YOUR_ANIME_DETAIL_SLOT_ID" className="mb-6" />

          {/* App CTA — compact */}
          <div className="flex items-center gap-4 p-4 rounded-2xl mb-6"
            style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}>
            <div className="flex-1 min-w-0">
              <p className="font-body text-xs font-semibold text-white/90">Watch on MugenAnime App</p>
              <p className="font-body text-[0.625rem] mt-0.5" style={{ color: "rgba(222,229,255,0.4)" }}>
                HD · Sub &amp; Dub · Free · No ads
              </p>
            </div>
            <Link href="/apps"
              className="flex-none flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-headline text-xs font-bold text-white cursor-pointer transition-all active:scale-95 hover:brightness-110"
              style={{ background: "linear-gradient(135deg,#8B5CF6,#D946EF)", boxShadow: "0 4px 16px rgba(139,92,246,0.35)" }}>
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v5.69L7.03 6.22a.75.75 0 0 0-1.06 1.06l3.5 3.5a.75.75 0 0 0 1.06 0l3.5-3.5a.75.75 0 0 0-1.06-1.06l-2.22 2.22V2.75Z" />
              </svg>
              Get App
            </Link>
          </div>

          {/* Episode list */}
          <AnimeEpisodeList episodes={episodes} animeTitle={title} animeId={id} />

          {/* Ad — below episode list */}
          <AdUnit slot="YOUR_ANIME_EPISODES_SLOT_ID" className="mt-6" />

          <div className="h-6" />
        </div>
      </div>
    </>
  );
}

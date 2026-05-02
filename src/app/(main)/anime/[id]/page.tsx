import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getAnimeInfo } from "@/lib/api";
import AnimatedButton from "@/components/AnimatedButton";
import AnimeEpisodeList from "@/components/AnimeEpisodeList";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "";

// ─── Metadata ──────────────────────────────────────────────────────────────────
export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { t } = await searchParams;
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

  const title = anime.title ?? anime.name ?? "Anime";
  const description = (anime.description ?? anime.synopsis ?? `Watch ${title} in HD for free on MugenAnime.`).slice(0, 160);
  const ogImage = anime.image ?? anime.poster ?? null;

  return {
    title: `${title} — Watch Free HD | MugenAnime`,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "MugenAnime",
      type: "video.tv_show",
      ...(ogImage ? { images: [{ url: ogImage, alt: title }] } : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default async function AnimePage({ params }: PageProps) {
  const { id } = await params;
  const anime = await getAnimeInfo(id);
  if (!anime) notFound();

  const title       = anime.title ?? anime.name ?? "";
  const poster      = anime.image ?? anime.poster ?? "";
  const cover       = anime.cover ?? poster;
  const description = anime.description ?? anime.synopsis ?? "";
  const episodes: any[] = anime.episodes ?? [];
  const genres: string[] = anime.genres ?? [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    name: title,
    description: description || undefined,
    ...(poster ? { image: poster } : {}),
    ...(genres.length ? { genre: genres } : {}),
    url: `${SITE}/anime/${id}`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen">

        {/* ── Hero ── */}
        <div className="relative h-[50vh] min-h-[400px]">
          {cover && (
            <Image src={cover} alt={title} fill sizes="100vw" className="object-cover opacity-30" priority />
          )}
          <div className="absolute inset-0 bg-linear-to-t from-background via-background/60 to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 p-8">
            <div className="mx-auto max-w-7xl flex flex-col md:flex-row gap-8 items-end">
              <div className="relative w-[200px] h-[300px] flex-none rounded-lg overflow-hidden shadow-xl">
                {poster ? (
                  <Image src={poster} alt={title} fill sizes="200px" className="object-cover" />
                ) : (
                  <div className="w-full h-full bg-surface flex items-center justify-center">
                    <span className="text-text-main/50">No Image</span>
                  </div>
                )}
              </div>

              <div className="flex-1">
                <h1 className="font-headline text-4xl font-bold text-text-main tracking-tight mb-4">{title}</h1>
                {genres.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {genres.map((g, i) => (
                      <span key={i} className="px-3 py-1 bg-surface-high/80 rounded-full font-body text-xs text-text-main/80">{g}</span>
                    ))}
                  </div>
                )}
                {anime.status && (
                  <span className={`inline-block px-3 py-1 rounded font-body text-sm mb-4 ${
                    anime.status === "Ongoing" || anime.status === "Releasing"
                      ? "bg-tertiary text-background neon-glow-tertiary"
                      : "bg-secondary text-background neon-glow-secondary"
                  }`}>{anime.status}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {description && (
            <div className="mb-8">
              <h2 className="font-headline text-xl font-semibold text-text-main mb-3">Synopsis</h2>
              <p className="font-body text-text-main/70 leading-relaxed max-w-3xl">{description}</p>
            </div>
          )}

          <div className="mb-8 p-6 glass rounded-xl border border-primary/20">
            <p className="font-body text-text-main/80 mb-4">
              Watch <span className="text-primary font-semibold">{title}</span> in HD on the Mugen App — free, sub & dub, no ads.
            </p>
            <AnimatedButton href="/apps" text="Download Free App" />
          </div>

          <AnimeEpisodeList episodes={episodes} animeTitle={title} animeId={id} />
        </div>
      </div>
    </>
  );
}

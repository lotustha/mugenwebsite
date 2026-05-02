import { Metadata } from "next";
import { getMovieInfo } from "@/lib/movie-api";
import MovieDetailContent from "./MovieDetailContent";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { t } = await searchParams;

  // Fast path: title passed from list page — no API call needed
  if (t) {
    const title = decodeURIComponent(t);
    return {
      title: `${title} — Mugen`,
      description: "Watch on the Mugen App",
      alternates: { canonical: `/movies/${id}` },
    };
  }

  // Slow path: direct visit or bot — fetch full metadata
  const media = await getMovieInfo(id);
  if (!media) return { title: "Not Found — Mugen" };

  const title = media.title ?? media.name ?? "Mugen";
  const description = media.overview ?? media.synopsis ?? media.description ?? "Watch on the Mugen App";
  const image = media.poster ?? media.posterPath ?? media.image;

  return {
    title: `${title} — Mugen`,
    description,
    alternates: { canonical: `/movies/${id}` },
    openGraph: { title, description, images: image ? [image] : [] },
  };
}

export default async function MovieDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <MovieDetailContent id={id} />;
}

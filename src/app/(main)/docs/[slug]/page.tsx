import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { marked } from "marked";
import { DOCS, readDoc } from "@/lib/docs";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return Object.keys(DOCS).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const doc = DOCS[slug];
  if (!doc) return {};
  return {
    title: `${doc.title} | MugenAnime Docs`,
    description: doc.description,
  };
}

export default async function DocPage({ params }: Props) {
  const { slug } = await params;
  const doc = DOCS[slug];
  const md = await readDoc(slug);
  if (!doc || !md) notFound();

  // The page renders its own <h1> from the registry, so drop the file's.
  const body = md.replace(/^#\s.*\n/, "");
  const html = await marked.parse(body, { gfm: true });

  return (
    <div className="min-h-screen py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Link
          href="/docs"
          className="font-body text-sm text-primary/80 hover:text-primary transition-colors"
        >
          ← All docs
        </Link>
        <h1 className="font-headline text-4xl font-bold text-text-main mt-4 mb-10 tracking-tight">
          {doc.title}
        </h1>
        <article
          className="article-body doc-body"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}

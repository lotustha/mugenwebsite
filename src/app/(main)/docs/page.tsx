import { Metadata } from "next";
import Link from "next/link";
import { DOCS } from "@/lib/docs";

export const metadata: Metadata = {
  title: "Documentation | MugenAnime",
  description: "Developer documentation for the MugenAnime APIs and mobile apps.",
};

export default function DocsIndexPage() {
  return (
    <div className="min-h-screen py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-headline text-4xl font-bold text-text-main mb-2 tracking-tight">
          Documentation
        </h1>
        <p className="font-body text-sm text-text-main/40 mb-10">
          Developer docs for the MugenAnime APIs and mobile apps.
        </p>

        <div className="space-y-4">
          {Object.entries(DOCS).map(([slug, doc]) => (
            <Link
              key={slug}
              href={`/docs/${slug}`}
              className="block rounded-2xl p-6 transition-colors hover:border-primary/40"
              style={{
                background: "rgba(9,19,40,0.5)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <h2 className="font-headline text-lg font-semibold text-text-main mb-1">
                {doc.title}
              </h2>
              <p className="font-body text-sm text-text-main/50 leading-relaxed">
                {doc.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

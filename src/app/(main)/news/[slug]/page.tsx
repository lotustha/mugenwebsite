import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

interface PageProps {
  params: Promise<{ slug: string }>;
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "";

function calcReadTime(html: string) {
  const words = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

async function getPost(slug: string) {
  return prisma.post.findFirst({
    where: { slug, published: true },
    select: {
      id: true, title: true, slug: true, summary: true, content: true,
      featuredImage: true, featuredImageAlt: true, createdAt: true,
    },
  });
}

async function getPopularPosts(excludeSlug: string) {
  return prisma.post.findMany({
    where: { published: true, slug: { not: excludeSlug } },
    take: 5,
    orderBy: { createdAt: "desc" },
    select: { id: true, slug: true, title: true, createdAt: true },
  });
}

async function getRelatedPosts(excludeSlug: string) {
  return prisma.post.findMany({
    where: { published: true, slug: { not: excludeSlug } },
    take: 4,
    orderBy: { createdAt: "desc" },
    select: { id: true, slug: true, title: true, summary: true, featuredImage: true, createdAt: true },
  });
}

// ─── Metadata ──────────────────────────────────────────────────────────────────
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Article Not Found" };

  const canonical = `${SITE}/news/${slug}`;
  const description = post.summary.slice(0, 160);
  const ogImage = post.featuredImage
    ? { url: post.featuredImage, alt: post.featuredImageAlt || post.title }
    : null;

  return {
    title: `${post.title} — MugenAnime News`,
    description,
    alternates: { canonical },
    openGraph: {
      title: post.title,
      description,
      url: canonical,
      siteName: "MugenAnime",
      type: "article",
      publishedTime: post.createdAt.toISOString(),
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title: post.title,
      description,
      ...(ogImage ? { images: [ogImage.url] } : {}),
    },
  };
}

// ─── Ad slot ───────────────────────────────────────────────────────────────────
function AdSlot({ label, className = "" }: { label: string; className?: string }) {
  return (
    <div className={`flex items-center justify-center rounded-xl border border-dashed ${className}`}
      style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.015)" }}>
      <span className="font-body text-[10px] uppercase tracking-[0.2em] select-none"
        style={{ color: "rgba(255,255,255,0.12)" }}>
        Advertisement · {label}
      </span>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default async function NewsArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const [post, popularPosts, relatedPosts] = await Promise.all([
    getPost(slug),
    getPopularPosts(slug),
    getRelatedPosts(slug),
  ]);
  if (!post) notFound();

  const readTime = post.content ? calcReadTime(post.content) : null;
  const pageUrl  = `${SITE}/news/${slug}`;

  const twitterShare  = `https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(pageUrl)}`;
  const facebookShare = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: post.title,
    description: post.summary,
    datePublished: post.createdAt.toISOString(),
    dateModified: post.createdAt.toISOString(),
    author: { "@type": "Organization", name: "MugenAnime" },
    publisher: { "@type": "Organization", name: "MugenAnime", url: SITE },
    mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl },
    ...(post.featuredImage ? { image: post.featuredImage } : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen">

        {/* ── Hero ── */}
        <div className="relative h-[58vh] min-h-[420px] max-h-[620px] overflow-hidden">
          {post.featuredImage ? (
            <Image src={post.featuredImage} alt={post.featuredImageAlt || post.title}
              fill className="object-cover" priority />
          ) : (
            <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,#1a0533 0%,#0b0416 100%)" }} />
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(6,14,32,0.15) 0%, rgba(6,14,32,0.5) 50%, rgba(6,14,32,0.97) 100%)" }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(6,14,32,0.4) 0%, transparent 30%, transparent 70%, rgba(6,14,32,0.4) 100%)" }} />

          <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-6 lg:px-8 pb-10">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <span className="px-3 py-1 rounded-full font-body text-xs font-semibold uppercase tracking-widest"
                  style={{ background: "rgba(139,92,246,0.2)", color: "#ba9eff", border: "1px solid rgba(139,92,246,0.35)" }}>
                  Anime News
                </span>
                {readTime && (
                  <span className="font-body text-xs" style={{ color: "rgba(222,229,255,0.5)" }}>{readTime} min read</span>
                )}
                <time className="font-body text-xs" dateTime={post.createdAt.toISOString()} style={{ color: "rgba(222,229,255,0.4)" }}>
                  {formatDate(post.createdAt.toISOString())}
                </time>
              </div>
              <h1 className="font-headline font-bold text-text-main leading-tight max-w-4xl"
                style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)" }}>
                {post.title}
              </h1>
            </div>
          </div>
        </div>

        {/* ── Meta bar ── */}
        <div className="sticky top-16 z-20 backdrop-blur-xl border-b"
          style={{ background: "rgba(6,14,32,0.85)", borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center gap-4">
            <Link href="/news" className="font-body text-xs transition-colors duration-200 flex items-center gap-1.5"
              style={{ color: "rgba(222,229,255,0.4)" }}>
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
              </svg>
              News
            </Link>
            <span style={{ color: "rgba(255,255,255,0.1)" }}>/</span>
            <span className="font-body text-xs truncate" style={{ color: "rgba(222,229,255,0.5)" }}>{post.title}</span>

            <div className="ml-auto flex items-center gap-2">
              <span className="font-body text-[0.6875rem] uppercase tracking-widest hidden sm:block" style={{ color: "rgba(222,229,255,0.25)" }}>Share</span>
              <a href={twitterShare} target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3" style={{ color: "rgba(222,229,255,0.55)" }}>
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.26 5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a href={facebookShare} target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3" style={{ color: "rgba(222,229,255,0.55)" }}>
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_320px] gap-10">

            {/* ── Main article ── */}
            <main className="min-w-0">
              <AdSlot label="728×90 Leaderboard" className="h-[90px] mb-8" />

              {post.summary && (
                <p className="font-body text-lg leading-relaxed mb-8 font-medium"
                  style={{ color: "rgba(222,229,255,0.75)", borderLeft: "3px solid #8B5CF6", paddingLeft: "1.25rem", borderRadius: "0 0.25rem 0.25rem 0" }}>
                  {post.summary}
                </p>
              )}

              {post.content && (
                <div className="article-body" dangerouslySetInnerHTML={{ __html: post.content }} />
              )}

              <AdSlot label="In-Article 300×250" className="h-[250px] my-10" />

              <div className="pt-8 border-t flex flex-wrap gap-2" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                {["Anime", "News", "2025"].map(tag => (
                  <span key={tag}
                    className="px-3 py-1.5 rounded-full font-body text-xs cursor-pointer transition-all duration-200 hover:scale-105"
                    style={{ background: "rgba(139,92,246,0.1)", color: "rgba(186,158,255,0.8)", border: "1px solid rgba(139,92,246,0.2)" }}>
                    #{tag}
                  </span>
                ))}
              </div>

              <div className="mt-8 p-5 rounded-xl flex gap-4 items-center"
                style={{ background: "rgba(9,19,40,0.6)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="w-12 h-12 rounded-full flex-none flex items-center justify-center font-headline text-lg font-bold"
                  style={{ background: "linear-gradient(135deg,#8B5CF6,#D946EF)", color: "white" }}>
                  M
                </div>
                <div>
                  <p className="font-headline text-sm font-semibold text-text-main">MugenAnime</p>
                  <p className="font-body text-xs mt-0.5" style={{ color: "rgba(222,229,255,0.45)" }}>
                    Your ultimate source for anime news, reviews, and updates.
                  </p>
                </div>
              </div>
            </main>

            {/* ── Sidebar ── */}
            <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
              {/* Popular posts */}
              <div className="rounded-xl overflow-hidden" style={{ background: "rgba(9,19,40,0.6)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="px-5 py-4 border-b flex items-center gap-2.5" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <div className="w-1 h-4 rounded-full" style={{ background: "linear-gradient(180deg,#ba9eff,#8455ef)" }} />
                  <h3 className="font-headline text-sm font-semibold uppercase tracking-widest" style={{ color: "rgba(186,158,255,0.9)" }}>
                    Popular Posts
                  </h3>
                </div>
                <div className="p-4 space-y-1">
                  {popularPosts.map((p, i) => (
                    <Link key={p.id} href={`/news/${p.slug}`}
                      className="flex gap-3 p-2 rounded-lg group transition-all duration-200 hover:bg-white/4">
                      <span className="font-headline text-lg font-bold flex-none w-7 text-right leading-tight mt-0.5"
                        style={{ color: "rgba(139,92,246,0.35)" }}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-[0.8125rem] leading-snug line-clamp-2 transition-colors duration-200 group-hover:text-primary"
                          style={{ color: "rgba(222,229,255,0.75)" }}>
                          {p.title}
                        </p>
                        <p className="font-body text-[0.6875rem] mt-1" style={{ color: "rgba(222,229,255,0.3)" }}>
                          {formatDate(p.createdAt.toISOString())}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <AdSlot label="300×600 Half Page" className="h-[300px]" />

              <div className="rounded-xl p-5 text-center"
                style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(217,70,239,0.08))", border: "1px solid rgba(139,92,246,0.2)" }}>
                <div className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg,#8B5CF6,#D946EF)" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                </div>
                <h4 className="font-headline text-sm font-bold text-text-main mb-1">Stay Updated</h4>
                <p className="font-body text-xs mb-4" style={{ color: "rgba(222,229,255,0.45)" }}>
                  Get the latest anime news delivered to your inbox.
                </p>
                <Link href="/support"
                  className="block w-full py-2 rounded-lg font-headline text-xs font-semibold text-center transition-opacity duration-200 hover:opacity-90"
                  style={{ background: "linear-gradient(135deg,#8B5CF6,#D946EF)", color: "white" }}>
                  Subscribe
                </Link>
              </div>
            </aside>
          </div>
        </div>

        {/* ── Related posts ── */}
        {relatedPosts.length > 0 && (
          <section className="border-t" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(6,14,32,0.5)" }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-1 h-6 rounded-full" style={{ background: "linear-gradient(180deg,#8B5CF6,#D946EF)" }} />
                <h2 className="font-headline text-xl font-bold text-text-main">More Articles</h2>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {relatedPosts.map(p => (
                  <Link key={p.id} href={`/news/${p.slug}`} className="group cursor-pointer">
                    <div className="aspect-video rounded-xl overflow-hidden mb-3"
                      style={{ background: "linear-gradient(135deg,#1a0533,#060e20)" }}>
                      {p.featuredImage ? (
                        <Image src={p.featuredImage} alt={p.title} width={400} height={225}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full opacity-20" style={{ background: "linear-gradient(135deg,#8B5CF6,#D946EF)" }} />
                        </div>
                      )}
                    </div>
                    <p className="font-body text-[0.6875rem] mb-1" style={{ color: "rgba(222,229,255,0.35)" }}>
                      {formatDate(p.createdAt.toISOString())}
                    </p>
                    <h3 className="font-headline text-sm font-semibold text-text-main line-clamp-2 group-hover:text-primary transition-colors duration-200">
                      {p.title}
                    </h3>
                    {p.summary && (
                      <p className="font-body text-xs mt-1 line-clamp-2" style={{ color: "rgba(222,229,255,0.4)" }}>
                        {p.summary}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </>
  );
}

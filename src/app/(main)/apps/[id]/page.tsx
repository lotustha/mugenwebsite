import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AppDetailClient from "./AppDetailClient";

// Render on every request so admin edits show without a deploy.
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const INCLUDE = {
  links: true,
  screenshots: { orderBy: { order: "asc" as const } },
  faqs: { orderBy: { order: "asc" as const } },
};

async function getApp(slug: string) {
  const isUuid = UUID_RE.test(slug);
  const where  = isUuid
    ? { OR: [{ slug }, { id: slug }], published: true }
    : { slug, published: true };
  try {
    return await (prisma.app as any).findFirst({ where, include: INCLUDE });
  } catch {
    if (!isUuid) return null;
    return prisma.app.findFirst({ where: { id: slug }, include: { links: true } })
      .then(a => a ? { ...a, screenshots: [], faqs: [] } : null);
  }
}

// ─── Metadata ──────────────────────────────────────────────────────────────────
export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id: slug } = await params;
  const app = await getApp(slug);
  if (!app) return { title: "App Not Found" };

  const siteUrl   = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const description = (app.tagline || app.description?.replace(/\n/g, " ") || `Download ${app.name} for Android`).slice(0, 160);
  const ogImage   = app.bannerUrl || app.iconUrl;
  const canonical = `${siteUrl}/apps/${app.slug ?? app.id}`;

  return {
    title: `${app.name} – Free Download for Android | MugenAnime`,
    description,
    alternates: { canonical },
    openGraph: {
      title: app.name, description, url: canonical, siteName: "MugenAnime", type: "website",
      ...(ogImage && { images: [{ url: ogImage, alt: app.name }] }),
    },
    twitter: {
      card: app.bannerUrl ? "summary_large_image" : "summary",
      title: app.name, description,
      ...(ogImage && { images: [ogImage] }),
    },
  };
}

// ─── JSON-LD ───────────────────────────────────────────────────────────────────
function AppJsonLd({ app }: { app: any }) {
  const playStore = app.links?.find((l: any) =>
    l.platform.toLowerCase().includes("play") || l.platform.toLowerCase().includes("google"));
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: app.name,
      ...(app.tagline || app.description ? { description: app.tagline || app.description } : {}),
      ...(app.category ? { applicationCategory: app.category } : {}),
      operatingSystem: "Android",
      softwareVersion: app.version,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      ...(playStore ? { downloadUrl: playStore.url } : {}),
      ...(app.iconUrl ? { image: app.iconUrl } : {}),
    })}} />
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default async function AppDetailPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: slug } = await params;
  const app = await getApp(slug);
  if (!app) notFound();

  return (
    <>
      <AppJsonLd app={app} />
      <AppDetailClient app={app} />
    </>
  );
}

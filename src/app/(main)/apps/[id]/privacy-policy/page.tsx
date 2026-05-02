import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

const purple  = "#8B5CF6";
const magenta = "#D946EF";
const surf    = "rgba(9,19,40,0.55)";
const bdr     = "rgba(255,255,255,0.07)";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getApp(slug: string) {
  const isUuid = UUID_RE.test(slug);
  const where = isUuid
    ? { OR: [{ slug }, { id: slug }], published: true }
    : { slug, published: true };
  try {
    return await (prisma.app as any).findFirst({ where });
  } catch {
    if (!isUuid) return null;
    return prisma.app.findFirst({ where: { id: slug } });
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id: slug } = await params;
  const app = await getApp(slug);
  if (!app) return { title: "Privacy Policy" };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const appSlug = app.slug ?? app.id;
  return {
    title: `Privacy Policy – ${app.name} | MugenAnime`,
    description: `Read the privacy policy for ${app.name}.`,
    alternates: { canonical: `${siteUrl}/apps/${appSlug}/privacy-policy` },
    robots: { index: false },
  };
}

export default async function AppPrivacyPolicyPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: slug } = await params;
  const app = await getApp(slug);
  if (!app) notFound();

  const appSlug = app.slug ?? app.id;

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          {app.iconUrl ? (
            <div className="w-14 h-14 rounded-2xl overflow-hidden flex-none shadow-lg"
              style={{ border: "2px solid rgba(255,255,255,0.08)" }}>
              <Image src={app.iconUrl} alt={app.name} width={56} height={56} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-none shadow-lg"
              style={{ background: `linear-gradient(135deg,${purple},${magenta})` }}>
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-white">
                <path d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18h3" />
              </svg>
            </div>
          )}
          <div>
            <p className="font-body text-xs uppercase tracking-widest font-semibold mb-0.5" style={{ color: "rgba(222,229,255,0.35)" }}>
              {app.name}
            </p>
            <h1 className="font-headline text-2xl font-bold text-text-main">Privacy Policy</h1>
          </div>
        </div>

        {/* Content */}
        <div className="rounded-2xl p-6 md:p-8" style={{ background: surf, border: `1px solid ${bdr}` }}>
          {app.privacyPolicy ? (
            <div className="prose prose-invert max-w-none font-body text-sm leading-relaxed"
              style={{ color: "rgba(222,229,255,0.65)" }}>
              <div className="whitespace-pre-wrap">{app.privacyPolicy}</div>
            </div>
          ) : (
            <div className="text-center py-12 space-y-3">
              <p className="font-body text-sm" style={{ color: "rgba(222,229,255,0.4)" }}>
                Privacy policy is not yet available for this app.
              </p>
              <p className="font-body text-xs" style={{ color: "rgba(222,229,255,0.25)" }}>
                Please contact support@mugenanime.com for privacy-related inquiries.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-6">
          <Link href={`/apps/${appSlug}`} className="font-body text-sm transition-colors hover:text-primary" style={{ color: "rgba(222,229,255,0.35)" }}>
            ← Back to {app.name}
          </Link>
          <Link href="/apps" className="font-body text-xs transition-colors hover:text-text-main/60" style={{ color: "rgba(222,229,255,0.22)" }}>
            All Apps
          </Link>
        </div>
      </div>
    </div>
  );
}

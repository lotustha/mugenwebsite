import type { Metadata } from "next";
import { Inter, Epilogue } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const epilogue = Epilogue({
  variable: "--font-epilogue",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mugenstream.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  // ─── Core ───────────────────────────────────────────────────────────────────
  title: {
    default: "Mugen — The Ethereal Anime Archive",
    template: "%s | Mugen",
  },
  description:
    "Mugen is a cinematic anime streaming app for Android. Immersive playback, offline downloads, and a seamless dark-mode interface built for anime lovers.",
  keywords: [
    "anime streaming",
    "anime app",
    "mugen anime",
    "offline anime",
    "android anime app",
    "anime archive",
    "watch anime online",
    "best anime app",
  ],
  authors: [{ name: "Mugen" }],
  creator: "Mugen",
  publisher: "Mugen",

  // ─── Canonical ──────────────────────────────────────────────────────────────
  alternates: {
    canonical: "/",
  },

  // ─── Robots ─────────────────────────────────────────────────────────────────
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // ─── Open Graph (Facebook / LinkedIn / WhatsApp / Discord) ──────────────────
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Mugen",
    title: "Mugen — The Ethereal Anime Archive",
    description:
      "Stream anime in cinematic quality. Immersive edge-to-edge playback, offline downloads, and a deep-dark interface built for anime lovers. Available on Android.",
    images: [
      {
        url: "/assets/home_page.jpg",   // served as absolute URL via metadataBase
        width: 1200,
        height: 630,
        alt: "Mugen — Cinematic Anime Streaming App for Android",
        type: "image/jpeg",
        secureUrl: `${siteUrl}/assets/home_page.jpg`,
      },
    ],
  },

  // ─── Twitter / X Card ───────────────────────────────────────────────────────
  twitter: {
    card: "summary_large_image",
    site: "@mugenanime",          // update if you have a Twitter handle
    creator: "@mugenanime",
    title: "Mugen — The Ethereal Anime Archive",
    description:
      "Stream anime in cinematic quality. Immersive playback, offline downloads & a deep-dark UI. Available on Android.",
    images: {
      url: `${siteUrl}/assets/home_page.jpg`,
      alt: "Mugen — Cinematic Anime Streaming App",
    },
  },

  // ─── Favicon / Icons ────────────────────────────────────────────────────────
  icons: {
    icon: [{ url: "/icon.png", type: "image/png" }],
    apple: "/icon.png",
    shortcut: "/icon.png",
  },

  // ─── PWA Manifest ───────────────────────────────────────────────────────────
  manifest: "/manifest.json",

  // ─── App Links (Android deep-link for Facebook) ─────────────────────────────
  appLinks: {
    android: {
      package: "com.mugenstream.anime",
      app_name: "Mugen",
    },
  },

  // ─── Verification (add when you have the codes) ─────────────────────────────
  // verification: {
  //   google: "your-google-site-verification-code",
  //   other: {
  //     "facebook-domain-verification": "your-fb-domain-verification-code",
  //   },
  // },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${epilogue.variable} h-full antialiased`}
    >
      <head>
        {/* Facebook explicit OG statics (supplements Next.js generated tags) */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={siteUrl} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:type" content="image/jpeg" />
        <meta
          property="og:image:secure_url"
          content={`${siteUrl}/assets/home_page.jpg`}
        />

        {/* WhatsApp / Telegram also read these */}
        <meta name="theme-color" content="#0a0a0f" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

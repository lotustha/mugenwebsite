import type { Metadata } from "next";
import { Epilogue, Inter } from "next/font/google";
import "./globals.css";

const epilogue = Epilogue({
  variable: "--font-epilogue",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const publisherId = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID;

export const metadata: Metadata = {
  title: "Mugen Anime - Your Gateway to Anime",
  description: "Discover and explore the best anime content. Download the Mugen Anime app from Google Play Store.",
  openGraph: {
    title: "Mugen Anime",
    description: "Your Gateway to Anime",
    type: "website",
    locale: "en_US",
  },
  // AdSense site verification — tells Google this publisher ID owns this domain.
  // Get this from AdSense → Sites → Add site → copy the ca-pub-XXXX value.
  ...(publisherId ? { other: { "google-adsense-account": publisherId } } : {}),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${epilogue.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className="min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}

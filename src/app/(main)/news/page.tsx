import NewsContent from "./NewsContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Anime News — Mugen",
  description: "Latest anime news, updates, reviews and articles from the world of anime.",
};

export default function NewsPage() {
  return <NewsContent />;
}

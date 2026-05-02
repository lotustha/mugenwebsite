"use client";

interface PlayStoreButtonProps {
  text?: string;
  source: string;
  animeId?: string;
}

export default function PlayStoreButton({ text = "Download App", source, animeId }: PlayStoreButtonProps) {
  const handleClick = async () => {
    await fetch("/api/track-click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, animeId }),
    });
    
    window.location.href = process.env.NEXT_PUBLIC_PLAYSTORE_URL || "https://play.google.com";
  };

  return (
    <button
      onClick={handleClick}
      className="px-6 py-3 bg-gradient-to-r from-primary to-primary-dim rounded-md font-headline font-semibold text-surface transition-all hover:opacity-90 hover:scale-105"
    >
      {text}
    </button>
  );
}

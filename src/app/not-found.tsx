import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center">
        <h1 className="font-headline text-8xl font-bold text-primary mb-4">404</h1>
        <h2 className="font-headline text-2xl font-bold text-text-main mb-4">
          Anime Not Found
        </h2>
        <p className="font-body text-text-main/70 mb-8">
          The anime you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-primary hover:bg-primary-dim font-heading font-semibold text-surface rounded transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}

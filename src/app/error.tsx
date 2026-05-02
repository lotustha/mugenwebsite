"use client";

import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center">
        <h1 className="font-headline text-8xl font-bold text-primary mb-4">500</h1>
        <h2 className="font-headline text-2xl font-bold text-text-main mb-4">
          Something went wrong
        </h2>
        <p className="font-body text-text-main/70 mb-8">
          {error.message || "We encountered an unexpected error. Please try again."}
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <button
            onClick={reset}
            className="inline-block px-6 py-3 bg-primary hover:bg-primary-dim font-headline font-semibold text-surface rounded transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-surface hover:bg-surface-high font-headline font-semibold text-text-main rounded transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}

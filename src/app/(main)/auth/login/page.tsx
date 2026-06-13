"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useCurrentUser } from "@/components/social/SocialProvider";

function GoogleIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.15-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.85 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.67-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.67 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/social";
  const { refresh } = useCurrentUser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await signIn("credentials", { email, password, redirect: false });
      if (res?.error) {
        setError("Invalid email or password.");
        return;
      }
      await refresh();
      router.push(next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-4 py-24">
      <div className="glass-panel ambient-shadow w-full max-w-md rounded-2xl p-8">
        <h1 className="font-headline bg-gradient-to-r from-primary via-text-tertiary to-secondary bg-clip-text text-3xl font-extrabold text-transparent">
          Welcome back
        </h1>
        <p className="mt-1 text-sm text-text-main/60">
          Sign in to share clips, follow creators, and join the discussion.
        </p>

        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: next })}
          className="glass-dark mt-6 flex w-full items-center justify-center gap-3 rounded-full px-4 py-3 font-medium text-text-main transition hover:border-brand"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div className="my-6 flex items-center gap-3 text-xs text-text-main/40">
          <span className="h-px flex-1 bg-outline-variant" />
          or
          <span className="h-px flex-1 bg-outline-variant" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-main/70">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl border border-outline-variant bg-surface-low px-4 py-3 text-text-main outline-none transition focus:border-brand"
              placeholder="you@example.com"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-main/70">Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border border-outline-variant bg-surface-low px-4 py-3 text-text-main outline-none transition focus:border-brand"
              placeholder="••••••••"
            />
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="bg-brand neon-glow-primary mt-1 rounded-full px-4 py-3 font-headline font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-text-main/60">
          New here?{" "}
          <Link href="/auth/signup" className="text-brand hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh]" />}>
      <LoginForm />
    </Suspense>
  );
}

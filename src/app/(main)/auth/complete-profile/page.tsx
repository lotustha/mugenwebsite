"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/components/social/SocialProvider";

export default function CompleteProfilePage() {
  const router = useRouter();
  const { user, loading, refresh } = useCurrentUser();
  const fileRef = useRef<HTMLInputElement>(null);

  const [avatar, setAvatar] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hydratedId, setHydratedId] = useState<string | null>(null);
  const hydrated = hydratedId !== null;

  // Pre-fill once per user, adjusting state during render (React-recommended
  // pattern for deriving form state from a prop — no cascading effect).
  if (user && hydratedId !== user.id) {
    setHydratedId(user.id);
    setAvatar(user.avatar ?? null);
    setDisplayName(user.displayName ?? "");
    setUsername(user.username ?? "");
    setBio(user.bio ?? "");
  }

  // Redirect anonymous visitors once the session has resolved.
  useEffect(() => {
    if (!loading && !user) router.push("/auth/login");
  }, [loading, user, router]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", "avatars");
      const res = await fetch("/api/social/upload", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        setError(data?.error || "Upload failed.");
        return;
      }
      setAvatar(data.url);
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: username.trim() || undefined,
          displayName: displayName.trim() || undefined,
          bio,
          avatar,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Could not save your profile.");
        return;
      }
      await refresh();
      const handle = data?.user?.username || username.trim();
      router.push(handle ? `/u/${handle}` : "/social");
    } finally {
      setBusy(false);
    }
  }

  if (loading || (!user && !hydrated)) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
      </main>
    );
  }

  const initial = (displayName || username || "?").charAt(0).toUpperCase();

  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-4 py-24">
      <div className="glass-panel ambient-shadow w-full max-w-md rounded-2xl p-8">
        <h1 className="font-headline text-2xl font-bold text-text-main">Set up your profile</h1>
        <p className="mt-1 text-sm text-text-main/60">Tell the community a little about you.</p>

        <form onSubmit={handleSave} className="mt-6 flex flex-col gap-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="ring-brand grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-low ring-2"
              aria-label="Upload avatar"
            >
              {avatar ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={avatar} alt="avatar preview" className="h-full w-full object-cover" />
                </>
              ) : (
                <span className="font-headline text-2xl font-semibold text-text-main/50">{initial}</span>
              )}
            </button>
            <div className="text-sm">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-brand font-medium hover:underline"
              >
                {uploading ? "Uploading…" : "Change photo"}
              </button>
              <p className="text-text-main/40">JPG or PNG.</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-main/70">Display name</span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="rounded-xl border border-outline-variant bg-surface-low px-4 py-3 text-text-main outline-none transition focus:border-brand"
              placeholder="Your name"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-main/70">Username</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="rounded-xl border border-outline-variant bg-surface-low px-4 py-3 text-text-main outline-none transition focus:border-brand"
              placeholder="username"
            />
            <span className="text-[0.7rem] text-text-main/40">
              3–20 characters, lowercase, letters/numbers/underscores.
            </span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="flex items-center justify-between text-xs font-medium text-text-main/70">
              Bio
              <span className="text-text-main/40">{bio.length}/280</span>
            </span>
            <textarea
              value={bio}
              maxLength={280}
              rows={3}
              onChange={(e) => setBio(e.target.value)}
              className="resize-none rounded-xl border border-outline-variant bg-surface-low px-4 py-3 text-text-main outline-none transition focus:border-brand"
              placeholder="Anime fan, casual artist, …"
            />
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={busy || uploading}
            className="bg-brand neon-glow-primary mt-1 rounded-full px-4 py-3 font-headline font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save profile"}
          </button>
        </form>
      </div>
    </main>
  );
}

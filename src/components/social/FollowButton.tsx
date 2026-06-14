"use client";

import { useState } from "react";
import { toggleFollow, OFFICIAL_USERNAME } from "@/lib/social-client";
import { useCurrentUser } from "./SocialProvider";

/** Follow/Following toggle. Hidden when viewing your own profile. */
export default function FollowButton({
  username,
  following: initialFollowing,
  isSelf = false,
  onAuthRequired,
  onCountChange,
  size = "md",
}: {
  username: string;
  following: boolean;
  isSelf?: boolean;
  onAuthRequired?: () => void;
  onCountChange?: (followers: number) => void;
  size?: "sm" | "md";
}) {
  const { user } = useCurrentUser();
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);
  // The official account is a locked follow — can't be unfollowed.
  const locked = username.toLowerCase() === OFFICIAL_USERNAME;

  if (isSelf) return null;

  async function handle() {
    if (!user) {
      onAuthRequired?.();
      return;
    }
    if (locked && following) return; // can't unfollow the official account
    if (busy) return;
    setBusy(true);
    const prev = following;
    setFollowing(!prev);
    try {
      const res = await toggleFollow(username, prev);
      setFollowing(res.following);
      onCountChange?.(res.followers);
    } catch {
      setFollowing(prev);
    } finally {
      setBusy(false);
    }
  }

  const pad = size === "sm" ? "px-3 py-1 text-xs" : "px-5 py-2 text-sm";

  // Locked + already following: show a non-interactive "Following" with a lock.
  if (locked && following) {
    return (
      <span
        title="You always follow the official account"
        className={`inline-flex cursor-default items-center gap-1.5 rounded-full font-semibold glass-panel text-text-main/70 ${pad}`}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        Following
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={busy}
      className={`rounded-full font-semibold transition-all disabled:opacity-60 ${pad} ${
        following
          ? "glass-panel text-text-main hover:border-brand"
          : "bg-brand text-white hover:opacity-90 ring-brand"
      }`}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}

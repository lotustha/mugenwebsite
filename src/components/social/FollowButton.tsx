"use client";

import { useState } from "react";
import { toggleFollow } from "@/lib/social-client";
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

  if (isSelf) return null;

  async function handle() {
    if (!user) {
      onAuthRequired?.();
      return;
    }
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

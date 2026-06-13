"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import UserAvatar from "./UserAvatar";
import RelativeTime from "./RelativeTime";
import FollowButton from "./FollowButton";
import VerifiedBadge from "./VerifiedBadge";
import ConnectionsModal from "./ConnectionsModal";

export interface ProfileData {
  id: string;
  username: string | null;
  displayName: string | null;
  avatar: string | null;
  verified: boolean;
  online: boolean;
  bio: string | null;
  joinedAt: string;
  counts: { followers: number; following: number; posts: number; discussions: number };
  isFollowing: boolean;
  isSelf: boolean;
}

/** Profile banner: avatar, identity, bio, stats, and follow/share/edit actions. */
export default function ProfileHeader({
  profile,
  onCountChange,
}: {
  profile: ProfileData;
  onCountChange?: (followers: number) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [followers, setFollowers] = useState(profile.counts.followers);
  const [connKind, setConnKind] = useState<"followers" | "following" | null>(null);
  const display = profile.displayName || profile.username || "Anonymous";
  const requireAuth = () => router.push(`/auth/login?next=${encodeURIComponent(pathname)}`);

  function handleFollowerCount(n: number) {
    setFollowers(n);
    onCountChange?.(n);
  }

  async function handleShare() {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ url, title: `${display} on MugenAnime` });
        return;
      } catch {
        /* cancelled */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* ignore */
    }
  }

  return (
    <>
    <header className="liquid-glass ambient-shadow rounded-3xl p-5 sm:p-6">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
        <UserAvatar user={profile} size="xl" ring link={false} />

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h1 className="font-headline text-brand inline-flex items-center gap-1.5 text-2xl font-bold leading-tight sm:text-3xl">
            {display}
            {profile.verified && <VerifiedBadge size={20} />}
          </h1>
          {profile.username && <p className="mt-0.5 text-sm text-text-main/60">@{profile.username}</p>}
          {profile.bio && <p className="mt-3 text-[15px] leading-relaxed text-text-main/85">{profile.bio}</p>}
          <p className="mt-2 text-xs text-text-main/50">
            Joined <RelativeTime iso={profile.joinedAt} />
          </p>

          {/* Stats */}
          <div className="mt-4 flex items-center justify-center gap-6 sm:justify-start">
            <Stat label="Posts" value={profile.counts.posts} />
            <Stat label="Followers" value={followers} onClick={profile.username ? () => setConnKind("followers") : undefined} />
            <Stat label="Following" value={profile.counts.following} onClick={profile.username ? () => setConnKind("following") : undefined} />
          </div>

          {/* Actions */}
          <div className="mt-5 flex items-center justify-center gap-3 sm:justify-start">
            {profile.isSelf ? (
              <Link
                href="/auth/complete-profile"
                className="glass-panel rounded-full px-5 py-2 text-sm font-semibold text-text-main transition-colors hover:border-brand"
              >
                Edit profile
              </Link>
            ) : (
              profile.username && (
                <FollowButton
                  username={profile.username}
                  following={profile.isFollowing}
                  isSelf={profile.isSelf}
                  onCountChange={handleFollowerCount}
                  onAuthRequired={() => router.push(`/auth/login?next=${encodeURIComponent(pathname)}`)}
                />
              )
            )}
            <button
              type="button"
              onClick={handleShare}
              className="glass-panel rounded-full px-5 py-2 text-sm font-semibold text-text-main transition-colors hover:border-brand"
            >
              Share
            </button>
          </div>
        </div>
      </div>
    </header>
    {profile.username && (
      <ConnectionsModal
        username={profile.username}
        kind={connKind}
        open={connKind !== null}
        onClose={() => setConnKind(null)}
        onAuthRequired={requireAuth}
      />
    )}
    </>
  );
}

function Stat({ label, value, onClick }: { label: string; value: number; onClick?: () => void }) {
  const inner = (
    <>
      <p className="font-headline text-lg font-bold tabular-nums text-text-main">{value}</p>
      <p className="text-xs text-text-main/55">{label}</p>
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} className="text-center transition-opacity hover:opacity-80">
      {inner}
    </button>
  ) : (
    <div className="text-center">{inner}</div>
  );
}

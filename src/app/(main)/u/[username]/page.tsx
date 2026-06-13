"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { SocialPost } from "@/lib/social-client";
import ProfileHeader, { type ProfileData } from "@/components/social/ProfileHeader";
import ProfileTabs from "@/components/social/ProfileTabs";

interface DiscussionItem {
  id: string;
  title: string;
  animeTag: string | null;
  replyCount: number;
  lastActiveAt: string;
  createdAt: string;
}

interface ProfileResponse {
  profile: ProfileData;
  tab: "posts" | "reels" | "discussions";
  items: (SocialPost | DiscussionItem)[];
  nextCursor: string | null;
}

export default function UserProfilePage() {
  const params = useParams<{ username: string }>();
  const username = Array.isArray(params.username) ? params.username[0] : params.username;

  const [data, setData] = useState<ProfileResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "notfound">("loading");

  useEffect(() => {
    if (!username) return;
    let alive = true;
    (async () => {
      if (alive) setStatus("loading");
      try {
        const res = await fetch(`/api/social/users/${username}`, { cache: "no-store" });
        if (!res.ok) {
          if (alive) setStatus("notfound");
          return;
        }
        const json = (await res.json()) as ProfileResponse;
        if (!alive) return;
        setData(json);
        setStatus("ready");
      } catch {
        if (alive) setStatus("notfound");
      }
    })();
    return () => {
      alive = false;
    };
  }, [username]);

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="liquid-glass animate-pulse rounded-3xl p-6">
          <div className="flex gap-6">
            <div className="h-[88px] w-[88px] shrink-0 rounded-full bg-surface-high/60" />
            <div className="flex-1 space-y-3 py-2">
              <div className="h-6 w-1/2 rounded bg-surface-high/60" />
              <div className="h-4 w-1/3 rounded bg-surface-high/40" />
              <div className="h-4 w-2/3 rounded bg-surface-high/30" />
            </div>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-1">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded bg-surface-low" />
          ))}
        </div>
      </div>
    );
  }

  if (status === "notfound" || !data) {
    return (
      <div className="mx-auto grid max-w-2xl place-items-center px-4 py-24 text-center">
        <p className="font-headline text-xl font-semibold text-text-main">This user doesn&apos;t exist</p>
        <p className="mt-2 text-sm text-text-main/55">The profile you&apos;re looking for couldn&apos;t be found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <ProfileHeader profile={data.profile} />
      <ProfileTabs
        username={data.profile.username ?? (username as string)}
        profile={data.profile}
        initialItems={data.items}
        initialTab={data.tab}
      />
    </div>
  );
}

// Canonical JSON shapes for the social surface, shared by web + mobile routes.
// All media URLs are absolutized via absolutizeMediaUrls() at the route boundary,
// so serializers here keep the relative /uploads/* paths.

import { absolutizeMediaUrls } from "@/lib/url";

/** A user counts as "online" if their presence heartbeat is within this window. */
const ONLINE_WINDOW_MS = 3 * 60 * 1000;

export interface PublicUser {
  id: string;
  username: string | null;
  displayName: string | null;
  avatar: string | null;
  verified: boolean;
  online: boolean;
}

export interface PublicPost {
  id: string;
  type: "IMAGE" | "VIDEO" | "REEL";
  status: "PROCESSING" | "READY" | "FAILED";
  caption: string | null;
  mediaUrl: string | null;
  posterUrl: string | null;
  durationSec: number | null;
  width: number | null;
  height: number | null;
  animeTag: string | null;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  author: PublicUser;
  liked: boolean;
  repostOf: PublicPost | null;
}

/** Minimal author shape selectable from Prisma. */
export const userSelect = {
  id: true,
  username: true,
  displayName: true,
  avatar: true,
  verified: true,
  lastSeenAt: true,
} as const;

type RawUser = {
  id: string;
  username: string | null;
  displayName: string | null;
  avatar: string | null;
  verified: boolean;
  lastSeenAt?: Date | null;
};

export function serializeUser(u: RawUser): PublicUser {
  const online = !!u.lastSeenAt && Date.now() - new Date(u.lastSeenAt).getTime() < ONLINE_WINDOW_MS;
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    avatar: u.avatar,
    verified: u.verified,
    online,
  };
}

interface RawPost {
  id: string;
  type: string;
  status: string;
  caption: string | null;
  mediaUrl: string | null;
  posterUrl: string | null;
  durationSec: number | null;
  width: number | null;
  height: number | null;
  animeTag: string | null;
  likesCount: number;
  commentsCount: number;
  createdAt: Date;
  author: RawUser;
  likes?: { userId: string }[]; // present when filtered to current viewer
  repostOf?: RawPost | null;
}

/** Build the canonical post shape. `viewerId` marks whether the viewer liked it. */
export function serializePost(p: RawPost, viewerId?: string | null): PublicPost {
  const liked = !!viewerId && Array.isArray(p.likes) && p.likes.some((l) => l.userId === viewerId);
  return {
    id: p.id,
    type: p.type as PublicPost["type"],
    status: p.status as PublicPost["status"],
    caption: p.caption,
    mediaUrl: p.mediaUrl,
    posterUrl: p.posterUrl,
    durationSec: p.durationSec,
    width: p.width,
    height: p.height,
    animeTag: p.animeTag,
    likesCount: p.likesCount,
    commentsCount: p.commentsCount,
    createdAt: p.createdAt.toISOString(),
    author: serializeUser(p.author),
    liked,
    repostOf: p.repostOf ? serializePost(p.repostOf, viewerId) : null,
  };
}

/** Absolutize all media URLs in a payload right before returning JSON. */
export function withAbsoluteMedia<T>(payload: T): T {
  return absolutizeMediaUrls(payload);
}

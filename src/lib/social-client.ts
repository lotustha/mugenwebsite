// Client-side typed helpers for the social API. Same shapes the mobile app sees.
// All fetches are same-origin and rely on the NextAuth cookie session on web.

export interface SocialUser {
  id: string;
  username: string | null;
  displayName: string | null;
  avatar: string | null;
  verified: boolean;
  online: boolean;
}

export interface SocialPost {
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
  author: SocialUser;
  liked: boolean;
  repostOf: SocialPost | null;
}

export interface SocialComment {
  id: string;
  content: string;
  parentId: string | null;
  createdAt: string;
  author: SocialUser;
}

export interface CurrentUser extends SocialUser {
  email: string;
  role: "USER" | "AUTHOR" | "ADMIN";
  bio?: string | null;
  _count?: { followers: number; following: number; socialPosts: number };
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export async function fetchMe(): Promise<CurrentUser | null> {
  const res = await fetch("/api/auth/me", { cache: "no-store" });
  const data = await json<{ user: CurrentUser | null }>(res);
  return data.user;
}

export async function fetchFeed(
  opts: { tab?: string; animeTag?: string; cursor?: string | null; following?: boolean } = {},
): Promise<{ items: SocialPost[]; nextCursor: string | null }> {
  const params = new URLSearchParams();
  if (opts.tab) params.set("tab", opts.tab);
  if (opts.animeTag) params.set("animeTag", opts.animeTag);
  if (opts.cursor) params.set("cursor", opts.cursor);
  const path = opts.following ? "/api/social/feed" : "/api/social/posts";
  return json(await fetch(`${path}?${params}`, { cache: "no-store" }));
}

export async function fetchPost(id: string): Promise<SocialPost> {
  const data = await json<{ post: SocialPost }>(await fetch(`/api/social/posts/${id}`, { cache: "no-store" }));
  return data.post;
}

export async function toggleLike(id: string, liked: boolean): Promise<{ liked: boolean; likesCount: number }> {
  return json(await fetch(`/api/social/posts/${id}/like`, { method: liked ? "DELETE" : "POST" }));
}

export async function toggleFollow(
  username: string,
  following: boolean,
): Promise<{ following: boolean; followers: number }> {
  return json(await fetch(`/api/social/users/${username}/follow`, { method: following ? "DELETE" : "POST" }));
}

export async function fetchComments(postId: string): Promise<SocialComment[]> {
  const data = await json<{ items: SocialComment[] }>(
    await fetch(`/api/social/posts/${postId}/comments`, { cache: "no-store" }),
  );
  return data.items;
}

export async function postComment(postId: string, content: string, parentId?: string): Promise<SocialComment> {
  const data = await json<{ comment: SocialComment }>(
    await fetch(`/api/social/posts/${postId}/comments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content, parentId }),
    }),
  );
  return data.comment;
}

export async function createPost(form: FormData): Promise<{ post: SocialPost }> {
  return json(await fetch("/api/social/posts", { method: "POST", body: form }));
}

export async function repost(id: string, caption?: string): Promise<{ post: SocialPost }> {
  return json(
    await fetch(`/api/social/posts/${id}/repost`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ caption }),
    }),
  );
}

/** Presence heartbeat — best-effort, never throws. */
export async function ping(): Promise<void> {
  try {
    await fetch("/api/social/ping", { method: "POST" });
  } catch {
    /* offline / ignore */
  }
}

export interface Connection extends SocialUser {
  bio: string | null;
  isFollowing: boolean;
  isSelf: boolean;
}

/** Fetch a user's followers or following list. */
export async function fetchConnections(
  username: string,
  kind: "followers" | "following",
): Promise<Connection[]> {
  const data = await json<{ items: Connection[] }>(
    await fetch(`/api/social/users/${username}/${kind}`, { cache: "no-store" }),
  );
  return data.items;
}

/** Build the share URL for a post (Web Share API / clipboard fallback). */
export function postShareUrl(id: string): string {
  if (typeof window === "undefined") return `/social/${id}`;
  return `${window.location.origin}/social/${id}`;
}

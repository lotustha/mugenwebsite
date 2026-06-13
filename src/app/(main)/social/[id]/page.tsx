"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchPost, type SocialPost } from "@/lib/social-client";
import PostCard from "@/components/social/PostCard";
import CommentThread from "@/components/social/CommentThread";

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  const [post, setPost] = useState<SocialPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const p = await fetchPost(id);
        if (active) setPost(p);
      } catch {
        if (active) setNotFound(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <div className="mx-auto max-w-xl px-3 pb-28 pt-3 md:pb-12">
      {/* Back link */}
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-text-main/60 transition-colors hover:text-text-main"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {loading ? (
        <DetailSkeleton />
      ) : notFound || !post ? (
        <div className="glass-panel mt-6 flex flex-col items-center gap-4 rounded-2xl px-6 py-16 text-center">
          <span className="text-5xl" aria-hidden>
            🜸
          </span>
          <div>
            <h1 className="font-headline text-lg font-semibold text-text-main">Post not found</h1>
            <p className="mt-1 text-sm text-text-main/60">It may have been removed or the link is broken.</p>
          </div>
          <Link href="/social" className="bg-brand rounded-full px-6 py-2.5 text-sm font-semibold text-white">
            Back to feed
          </Link>
        </div>
      ) : (
        <>
          <PostCard
            post={post}
            priority
            onAuthRequired={() => router.push(`/auth/login?next=${encodeURIComponent(pathname)}`)}
          />
          <CommentThread postId={post.id} postAuthor={post.author} commentsCount={post.commentsCount} />
        </>
      )}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="glass-panel overflow-hidden rounded-2xl">
        <div className="flex items-center gap-3 p-3.5">
          <span className="h-10 w-10 animate-pulse rounded-full bg-white/10" />
          <div className="flex-1 space-y-2">
            <span className="block h-3.5 w-32 animate-pulse rounded-full bg-white/10" />
            <span className="block h-2.5 w-20 animate-pulse rounded-full bg-white/[0.06]" />
          </div>
        </div>
        <div className="aspect-[4/5] w-full animate-pulse bg-white/[0.05]" />
        <div className="flex gap-5 px-3.5 py-3.5">
          <span className="h-5 w-10 animate-pulse rounded-full bg-white/10" />
          <span className="h-5 w-10 animate-pulse rounded-full bg-white/10" />
        </div>
      </div>
      <div className="flex gap-3">
        <span className="h-8 w-8 animate-pulse rounded-full bg-white/10" />
        <span className="h-16 flex-1 animate-pulse rounded-2xl bg-white/[0.05]" />
      </div>
    </div>
  );
}

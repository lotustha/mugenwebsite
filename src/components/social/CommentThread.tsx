"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  fetchComments,
  postComment,
  type SocialComment,
  type SocialUser,
} from "@/lib/social-client";
import { useCurrentUser } from "./SocialProvider";
import VerifiedBadge from "./VerifiedBadge";
import UserAvatar from "./UserAvatar";
import RelativeTime from "./RelativeTime";

interface ReplyTarget {
  id: string;
  name: string;
}

/** Threaded (1-level) comment list + composer for a post. */
export default function CommentThread({
  postId,
  postAuthor,
  commentsCount,
}: {
  postId: string;
  postAuthor?: SocialUser;
  commentsCount?: number;
}) {
  const { user } = useCurrentUser();
  const pathname = usePathname();

  const [comments, setComments] = useState<SocialComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const items = await fetchComments(postId);
        if (active) setComments(items);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Failed to load comments.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [postId]);

  // Build a 1-level tree: top-level comments, each with a flat list of replies.
  // A reply-to-a-reply is attached to its top-level ancestor.
  const threaded = useMemo(() => {
    const byId = new Map<string, SocialComment>();
    for (const c of comments) byId.set(c.id, c);

    // Resolve each comment to its top-level ancestor id.
    const rootOf = (c: SocialComment): string => {
      let cur = c;
      const seen = new Set<string>();
      while (cur.parentId && byId.has(cur.parentId) && !seen.has(cur.id)) {
        seen.add(cur.id);
        cur = byId.get(cur.parentId)!;
      }
      return cur.id;
    };

    const roots: SocialComment[] = [];
    const replies = new Map<string, SocialComment[]>();
    for (const c of comments) {
      if (!c.parentId || !byId.has(c.parentId)) {
        roots.push(c);
      } else {
        const root = rootOf(c);
        if (root === c.id) {
          roots.push(c);
        } else {
          const list = replies.get(root) ?? [];
          list.push(c);
          replies.set(root, list);
        }
      }
    }
    return { roots, replies };
  }, [comments]);

  const count = comments.length || commentsCount || 0;

  function startReply(target: SocialComment) {
    setReplyTo({ id: target.id, name: target.author.displayName || target.author.username || "user" });
    inputRef.current?.focus();
  }

  async function handleSend() {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setError(null);
    try {
      const created = await postComment(postId, content, replyTo?.id);
      setComments((prev) => [...prev, created]);
      setText("");
      setReplyTo(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to post comment.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="mt-4" aria-label="Comments">
      <h2 className="font-headline px-1 pb-3 text-base font-semibold text-text-main">
        Comments {count > 0 && <span className="text-text-main/50">· {count}</span>}
      </h2>

      {/* Composer */}
      {user ? (
        <div className="glass-panel rounded-2xl p-3">
          {replyTo && (
            <div className="mb-2 flex items-center justify-between rounded-lg bg-brand-soft px-3 py-1.5 text-xs text-text-main/80">
              <span>
                Replying to <span className="text-brand font-medium">{replyTo.name}</span>
              </span>
              <button type="button" onClick={() => setReplyTo(null)} className="text-text-main/60 hover:text-text-main" aria-label="Cancel reply">
                Cancel
              </button>
            </div>
          )}
          <div className="flex items-end gap-3">
            <UserAvatar user={user} size="sm" link={false} />
            <textarea
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              rows={1}
              placeholder={replyTo ? `Reply to ${replyTo.name}…` : "Add a comment…"}
              className="min-h-[40px] flex-1 resize-none rounded-xl border border-outline-variant bg-surface-low px-3 py-2 text-sm text-text-main placeholder:text-text-main/40 focus:border-primary focus:outline-none"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className="bg-brand grid h-10 shrink-0 place-items-center rounded-full px-4 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : "Send"}
            </button>
          </div>
        </div>
      ) : (
        <div className="glass-panel flex items-center justify-between gap-3 rounded-2xl p-4">
          <p className="text-sm text-text-main/70">Join the conversation.</p>
          <Link
            href={`/auth/login?next=${encodeURIComponent(pathname)}`}
            className="bg-brand rounded-full px-4 py-2 text-sm font-semibold text-white"
          >
            Log in to comment
          </Link>
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-xl bg-red-500/10 px-4 py-2.5 text-sm text-red-300" role="alert">
          {error}
        </p>
      )}

      {/* List */}
      <div className="mt-4 space-y-5">
        {loading ? (
          <CommentSkeleton />
        ) : threaded.roots.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-main/50">No comments yet — start the conversation.</p>
        ) : (
          threaded.roots.map((c) => (
            <div key={c.id}>
              <CommentRow comment={c} isAuthor={c.author.id === postAuthor?.id} onReply={() => startReply(c)} canReply={!!user} />
              {(threaded.replies.get(c.id) ?? []).length > 0 && (
                <div className="mt-3 space-y-3 border-l border-outline-variant pl-4">
                  {threaded.replies.get(c.id)!.map((r) => (
                    <CommentRow
                      key={r.id}
                      comment={r}
                      isAuthor={r.author.id === postAuthor?.id}
                      onReply={() => startReply(r)}
                      canReply={!!user}
                      small
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function CommentRow({
  comment,
  isAuthor,
  onReply,
  canReply,
  small = false,
}: {
  comment: SocialComment;
  isAuthor?: boolean;
  onReply: () => void;
  canReply: boolean;
  small?: boolean;
}) {
  const display = comment.author.displayName || comment.author.username || "Anonymous";
  return (
    <div className="flex gap-3">
      <UserAvatar user={comment.author} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl bg-surface-low px-3.5 py-2.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="font-headline inline-flex items-center gap-1 text-sm font-semibold text-text-main">
              {display}
              {comment.author.verified && <VerifiedBadge size={13} />}
            </span>
            {isAuthor && <span className="bg-brand-soft text-brand rounded-full px-2 py-0.5 text-[10px] font-medium">Author</span>}
            <RelativeTime iso={comment.createdAt} className="text-xs text-text-main/40" />
          </div>
          <p className={`mt-1 whitespace-pre-wrap break-words text-text-main/90 ${small ? "text-[13px]" : "text-sm"}`}>
            {comment.content}
          </p>
        </div>
        {canReply && (
          <button
            type="button"
            onClick={onReply}
            className="mt-1 pl-1 text-xs font-medium text-text-main/50 transition-colors hover:text-tertiary"
          >
            Reply
          </button>
        )}
      </div>
    </div>
  );
}

function CommentSkeleton() {
  return (
    <div className="space-y-5" aria-hidden>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <span className="h-8 w-8 animate-pulse rounded-full bg-white/10" />
          <div className="flex-1 space-y-2 rounded-2xl bg-surface-low px-3.5 py-2.5">
            <span className="block h-3 w-28 animate-pulse rounded-full bg-white/10" />
            <span className="block h-3 w-3/4 animate-pulse rounded-full bg-white/[0.06]" />
          </div>
        </div>
      ))}
    </div>
  );
}

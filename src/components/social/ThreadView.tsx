"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "./SocialProvider";
import type { SocialComment } from "@/lib/social-client";
import UserAvatar from "./UserAvatar";
import RelativeTime from "./RelativeTime";
import VerifiedBadge from "./VerifiedBadge";

type Reply = SocialComment;

interface ReplyNode extends Reply {
  children: ReplyNode[];
}

const CONTENT_MAX = 10000;
const MAX_VISUAL_DEPTH = 3;

/** Renders a nested reply tree plus composers for top-level and inline replies. */
export default function ThreadView({
  discussionId,
  replies: initialReplies,
}: {
  discussionId: string;
  replies: Reply[];
}) {
  const { user } = useCurrentUser();
  const pathname = usePathname();
  const [replies, setReplies] = useState<Reply[]>(initialReplies);

  const tree = useMemo(() => buildTree(replies), [replies]);

  const handleAdded = (reply: Reply) => setReplies((prev) => [...prev, reply]);

  return (
    <section className="mt-6">
      <h2 className="font-headline mb-3 text-sm font-semibold uppercase tracking-wide text-text-main/50">
        {replies.length} {replies.length === 1 ? "Reply" : "Replies"}
      </h2>

      {user ? (
        <ReplyComposer discussionId={discussionId} parentId={null} onAdded={handleAdded} autoFocus={false} />
      ) : (
        <div className="glass-panel rounded-xl p-4 text-center text-sm text-text-main/70">
          <Link href={`/auth/login?next=${encodeURIComponent(pathname)}`} className="text-brand font-medium">
            Log in
          </Link>{" "}
          to reply.
        </div>
      )}

      <div className="mt-5">
        {tree.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-main/50">No replies yet — share your take.</p>
        ) : (
          <div className="space-y-4">
            {tree.map((node) => (
              <ReplyItem
                key={node.id}
                node={node}
                depth={0}
                discussionId={discussionId}
                canReply={Boolean(user)}
                onAdded={handleAdded}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function buildTree(replies: Reply[]): ReplyNode[] {
  const map = new Map<string, ReplyNode>();
  replies.forEach((r) => map.set(r.id, { ...r, children: [] }));
  const roots: ReplyNode[] = [];
  map.forEach((node) => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

function ReplyItem({
  node,
  depth,
  discussionId,
  canReply,
  onAdded,
}: {
  node: ReplyNode;
  depth: number;
  discussionId: string;
  canReply: boolean;
  onAdded: (r: Reply) => void;
}) {
  const [replyingOpen, setReplyingOpen] = useState(false);
  const display = node.author.displayName || node.author.username || "Anonymous";
  const indented = depth > 0;

  return (
    <div
      className={
        indented
          ? "border-l-2 border-outline-variant/50 pl-3 sm:pl-4"
          : "glass-panel rounded-2xl p-3.5 sm:p-4"
      }
    >
      <div className="flex items-start gap-2.5">
        <UserAvatar user={node.author} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 text-xs text-text-main/55">
            <span className="inline-flex items-center gap-1 font-medium text-text-main/85">
              {display}
              {node.author.verified && <VerifiedBadge size={12} />}
            </span>
            <span aria-hidden>·</span>
            <RelativeTime iso={node.createdAt} />
          </div>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-text-main/90">
            {node.content}
          </p>

          {canReply && (
            <button
              type="button"
              onClick={() => setReplyingOpen((v) => !v)}
              className="mt-1.5 text-xs font-medium text-text-main/50 transition-colors hover:text-tertiary"
            >
              {replyingOpen ? "Cancel" : "Reply"}
            </button>
          )}

          {replyingOpen && (
            <div className="mt-2">
              <ReplyComposer
                discussionId={discussionId}
                parentId={node.id}
                autoFocus
                compact
                onAdded={(r) => {
                  onAdded(r);
                  setReplyingOpen(false);
                }}
              />
            </div>
          )}
        </div>
      </div>

      {node.children.length > 0 && (
        <div className={`mt-3 space-y-3 ${depth + 1 >= MAX_VISUAL_DEPTH ? "" : "ml-2 sm:ml-4"}`}>
          {node.children.map((child) => (
            <ReplyItem
              key={child.id}
              node={child}
              depth={Math.min(depth + 1, MAX_VISUAL_DEPTH)}
              discussionId={discussionId}
              canReply={canReply}
              onAdded={onAdded}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReplyComposer({
  discussionId,
  parentId,
  onAdded,
  autoFocus = false,
  compact = false,
}: {
  discussionId: string;
  parentId: string | null;
  onAdded: (r: Reply) => void;
  autoFocus?: boolean;
  compact?: boolean;
}) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const c = content.trim();
    if (!c || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/social/discussions/${discussionId}/replies`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: c, parentId: parentId ?? undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Could not post reply.");
        setSubmitting(false);
        return;
      }
      onAdded(data.reply as Reply);
      setContent("");
      setSubmitting(false);
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className={compact ? "" : "glass-panel rounded-2xl p-3"}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value.slice(0, CONTENT_MAX))}
        placeholder={parentId ? "Write a reply…" : "Share your take…"}
        rows={compact ? 2 : 3}
        maxLength={CONTENT_MAX}
        autoFocus={autoFocus}
        className="w-full resize-y rounded-xl border border-outline-variant/70 bg-surface-low px-3 py-2 text-sm leading-relaxed text-text-main placeholder:text-text-main/40 focus:border-primary/60 focus:outline-none"
      />
      {error && <p className="mt-1 text-xs text-secondary">{error}</p>}
      <div className="mt-2 flex justify-end">
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="bg-brand rounded-full px-4 py-1.5 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
        >
          {submitting ? "Posting…" : "Reply"}
        </button>
      </div>
    </form>
  );
}

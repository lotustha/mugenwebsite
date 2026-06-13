"use client";

import Link from "next/link";
import type { SocialUser } from "@/lib/social-client";

const SIZES = { sm: 32, md: 40, lg: 56, xl: 88 } as const;

/** Round avatar with a gradient-ring fallback initial. Links to the profile when username exists. */
export default function UserAvatar({
  user,
  size = "md",
  link = true,
  ring = false,
}: {
  user: Pick<SocialUser, "username" | "displayName" | "avatar">;
  size?: keyof typeof SIZES;
  link?: boolean;
  ring?: boolean;
}) {
  const px = SIZES[size];
  const initial = (user.displayName || user.username || "?").charAt(0).toUpperCase();

  const inner = user.avatar ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={user.avatar}
      alt={user.displayName || user.username || "avatar"}
      width={px}
      height={px}
      className="rounded-full object-cover"
      style={{ width: px, height: px }}
    />
  ) : (
    <span
      className="bg-brand grid place-items-center rounded-full font-headline font-semibold text-white"
      style={{ width: px, height: px, fontSize: px * 0.4 }}
    >
      {initial}
    </span>
  );

  const wrapped = (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-full ${ring ? "p-[2px] bg-brand" : ""}`}
      style={ring ? { width: px + 4, height: px + 4 } : undefined}
    >
      {inner}
    </span>
  );

  if (link && user.username) {
    return (
      <Link href={`/u/${user.username}`} aria-label={`${user.displayName || user.username} profile`}>
        {wrapped}
      </Link>
    );
  }
  return wrapped;
}

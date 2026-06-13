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
  showOnline = true,
}: {
  user: Pick<SocialUser, "username" | "displayName" | "avatar"> & { online?: boolean };
  size?: keyof typeof SIZES;
  link?: boolean;
  ring?: boolean;
  showOnline?: boolean;
}) {
  const px = SIZES[size];
  const initial = (user.displayName || user.username || "?").charAt(0).toUpperCase();
  const dotSize = Math.max(9, Math.round(px * 0.28));

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
    <span className="relative inline-block shrink-0 align-middle">
      <span
        className={`inline-grid place-items-center rounded-full ${ring ? "p-[2px] bg-brand" : ""}`}
        style={ring ? { width: px + 4, height: px + 4 } : undefined}
      >
        {inner}
      </span>
      {showOnline && user.online && (
        <span
          aria-label="Online"
          className="absolute bottom-0 right-0 rounded-full bg-green-500 ring-2 ring-background"
          style={{ width: dotSize, height: dotSize }}
        />
      )}
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

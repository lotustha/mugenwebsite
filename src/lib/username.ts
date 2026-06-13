// Username rules for public social handles (/u/[username]).
// 3–20 chars, lowercase letters/digits/underscore, must start with a letter.

const USERNAME_RE = /^[a-z][a-z0-9_]{2,19}$/;

const RESERVED = new Set([
  "admin", "api", "auth", "login", "signup", "logout", "settings", "u", "user",
  "users", "me", "social", "reels", "discuss", "feed", "notifications", "search",
  "anime", "manga", "movies", "wallpapers", "news", "apps", "support", "about",
  "privacy", "terms", "dmca", "null", "undefined", "root",
]);

export function isValidUsername(name: string): boolean {
  return USERNAME_RE.test(name) && !RESERVED.has(name);
}

/** Normalize a candidate handle (lowercase, strip invalid chars). */
export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
}

/** Derive a base handle from an email/display name for OAuth first-login suggestions. */
export function suggestUsername(seed: string): string {
  let base = normalizeUsername(seed.split("@")[0] || "");
  if (base.length < 3) base = `mugen${base}`;
  if (!/^[a-z]/.test(base)) base = `m${base}`;
  return base.slice(0, 16);
}

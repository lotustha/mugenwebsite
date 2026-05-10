# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

claude --print "[prompt]" --dangerously-skip-permissions --output-format stream-json | jq #no-restriction mode

```bash
npm run dev          # start dev server
npm run build        # production build
npm run lint         # ESLint

# Prisma (run after any schema change)
npx prisma db push --accept-data-loss   # sync schema to VPS Postgres (drops removed columns)
npx prisma generate                      # regenerate client (auto-runs after db push)

# If schema changed from single-FK category to many-to-many, --accept-data-loss is required
```

## Stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript** · **Tailwind CSS v4**
- **Prisma 7** with `PrismaPg` adapter — talks to **self-hosted Postgres on the VPS** (`localhost:5432/mugenwebsite`)
- **NextAuth (Auth.js) v5** with a Credentials provider (bcrypt-hashed passwords in `users.password`)
- **Local-filesystem storage** for uploads (under `UPLOAD_DIR`, served at `/uploads/*`)
- **Framer Motion** for animations · **Tiptap** for rich text editing

## Prisma 7 — Critical Differences from Prisma 5/6

- Client is generated to `src/generated/prisma/` — import from `@/generated/prisma/client`, **not** `@prisma/client`
- Runtime config lives in `prisma.config.ts` (`defineConfig`), not `schema.prisma` datasource block
- `prisma.config.ts` uses `DIRECT_URL` for migrations; runtime uses `DATABASE_URL` (pooled) via `PrismaPg` adapter
- `prisma db push` regenerates the client automatically

## Auth Pattern (NextAuth v5)

| File                       | When to use                                                              |
| -------------------------- | ------------------------------------------------------------------------ |
| `src/lib/auth.ts`          | Full NextAuth instance with Credentials provider — `auth()`, `signOut()` for server components / actions / API routes |
| `src/lib/auth.config.ts`   | Edge-safe config (no providers) — used only by `src/proxy.ts` middleware |
| `src/lib/auth-helpers.ts`  | `requireAdmin()` — drop-in for the old `supabase.auth.getUser()` pattern in admin API routes; returns `{id, email, role}` or `null` |
| `next-auth/react`          | Client components: `signIn("credentials", {...})`, `signOut(...)`        |

Session is JWT-based; `session.user.id` is the **Prisma `User.id`** so it can be used directly as a foreign key (uploaderId, authorId).

Auth enforcement runs in two places: `src/proxy.ts` (Next 16 middleware) redirects unauthenticated `/admin/**` to `/admin/login`, and `src/app/admin/(dashboard)/layout.tsx` does a server-side `auth()` check as a belt-and-suspenders.

**Bootstrap the first admin** with `npm run create-admin -- email@example.com 'password'` — runs `scripts/create-admin.mjs` which inserts/updates a hashed admin row directly via `pg`.

## Storage Pattern (local FS)

Files are written to `UPLOAD_DIR` (default `/www/wwwroot/mugenstream.fun/uploads`) and served by `src/app/uploads/[...path]/route.ts` at `/uploads/*`.

| Helper                                  | Purpose                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------ |
| `saveBuffer({buffer, folder, ext})`     | Write a buffer to `UPLOAD_DIR/folder/timestamp-rand.ext`; returns `{path, url}` where `url` is `/uploads/folder/...` |
| `uploadDir()`                           | Returns the resolved `UPLOAD_DIR` for the streaming route                |

For absolute URLs (e.g., the Flutter app), prepend `NEXT_PUBLIC_SITE_URL` to the returned `url`. In production, you can put nginx in front and serve `UPLOAD_DIR` directly to bypass the Next.js route.

## Route Groups

```
src/app/
  (main)/          # Public pages — wrapped by Navbar + Footer
  admin/
    (dashboard)/   # Auth-protected admin — server calls auth() (NextAuth), redirects to /admin/login
  api/
    admin/         # Admin-only API routes (auth checked inline per route via createClient().getUser())
    wallpapers/    # Public wallpapers API
    ...            # Other public API routes
```

## Key Architectural Patterns

**Prisma singleton** (`src/lib/prisma.ts`): `PrismaPg` adapter with `DATABASE_URL`. Uses `globalThis` cache to prevent connection exhaustion in dev hot-reload.

**Category resolution** (wallpapers): categories use `findFirst({ OR: [{ slug }, { name }] })` before attempting `create`, to avoid unique-constraint collisions when both `name` and `slug` are `@unique`. Never use bare `upsert({ where: { slug } })` — it will throw if `name` already exists with a different slug.

**Preview store** (`src/lib/preview-store.ts`): In-memory Map. Grid cards call `setPreview(key, data)` on click so the detail page can render instantly before its own API fetch resolves.

**Wallpaper categories**: Many-to-many (implicit join table). `Wallpaper.categories WallpaperCategory[]` — **not** a single FK. Admin API (`PATCH /api/admin/wallpapers`) uses `{ set: [...] }` to replace the full categories array.

**Video cards** (`WallpapersContent.tsx`): Videos use `preload="none"` and play/pause via `videoRef` on `mouseenter`/`mouseleave`. Never use `autoPlay` on grid cards.

## Environment Variables

```
DATABASE_URL                        # postgresql://mugenwebsite:mugenwebsite@localhost:5432/mugenwebsite
DIRECT_URL                          # Same as DATABASE_URL on the VPS (used by prisma.config.ts)
AUTH_SECRET                         # NextAuth JWT secret (openssl rand -base64 32)
UPLOAD_DIR                          # /www/wwwroot/mugenstream.fun/uploads (where files are saved on the VPS)
ANIME_API_BASE                      # External anime API
MOVIE_API_BASE                      # External movie API
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_ADSENSE_PUBLISHER_ID
GEMINI_API_KEY
OPENROUTER_API_KEY
CRON_SECRET                         # Validates /api/cron/* requests
```

## Design System

Global CSS variables + Tailwind v4 in `src/app/globals.css`. Core tokens:

- Background: `#0b0416`
- Primary accent: `#8B5CF6` (purple) / `#D946EF` (magenta)
- Fonts: **Epilogue** (`font-headline`) for headings · **Inter** (`font-body`) for body
- Glass panels: `rgba(9,19,40,0.5)` background + `rgba(255,255,255,0.07)` border + `backdrop-blur`
- All wallpaper cards use `aspect-[9/16]` portrait ratio

## Data Models — Quick Reference

| Model               | Notable                                                                                      |
| ------------------- | -------------------------------------------------------------------------------------------- |
| `Wallpaper`         | `type: IMAGE\|VIDEO`, `categories[]` (many-to-many), `tags[]` (many-to-many), `description?` |
| `WallpaperCategory` | `name @unique`, `slug @unique` — both unique, handle conflicts with `findFirst` OR query     |
| `Post`              | `slug @unique`, `published bool`, relates to `Category[]`, `Tag[]`, `SeoMeta?`               |
| `User`              | `role: USER\|AUTHOR\|ADMIN` — admin UI creates users with `ADMIN` role on first login        |
| `RssFeed`           | `scheduleMinutes`, `autoPublish` — cron at `/api/cron/rss-import` checks `CRON_SECRET`       |
| `SystemSetting`     | `key` as primary ID (string), `value` as text — generic key-value store                      |

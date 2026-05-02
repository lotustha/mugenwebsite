# Mugenstream Web Ecosystem (mugenstream.fun)

## 📌 Project Overview

The Mugenstream Web Ecosystem is a unified, SEO-optimized platform built to drive organic traffic, showcase mobile applications, and serve as a comprehensive anime hub. It integrates an AI-automated news blog, a user-generated wallpaper gallery, and a frontend interface for existing anime streaming APIs. The platform is designed from the ground up for strict Google AdSense compliance and high user engagement.

## 🛠️ Tech Stack & Architecture

- **Framework:** Next.js (App Router)
- **Database ORM:** Prisma
- **Backend as a Service (BaaS):** Supabase (PostgreSQL Database, Authentication, Storage Buckets)
- **Styling:** Tailwind CSS
- **Animation Engine:** Framer Motion
- **Deployment Target:** Dockerized deployment on a Contabo VPS.

## 🎨 UI/UX, Styling & Animation Directives (The Kinetic Canvas)

This project relies heavily on a premium, engaging user experience to keep retention high. The site must not feel static or boring.

- **Color Palette (Dark Purple Focus):**
  - **Backgrounds:** Deep, rich purples (e.g., `#0F0C20`, `#1A1625` or `#0b0416`).
  - **Primary Accents:** Vibrant, neon purples and magentas for buttons, glowing effects, and active states (e.g., `#8B5CF6`, `#D946EF`).
  - **Surfaces:** Translucent dark panels with subtle purple/blue tinted borders.
- **Glassmorphism:** \* Utilize Tailwind's `backdrop-blur`, background opacity (e.g., `bg-purple-900/20`), and subtle white/purple borders (`border-white/10`) to create floating glass cards for anime items, apps, and news.
- **Typography:**
  - **Headings:** `Epilogue` (Bold, tight tracking for heroic anime titles and section headers).
  - **Body/UI:** `Inter` (Clean, legible for synopses, metadata, and app details).
- **Animation Directives (Framer Motion):**
  - **MANDATORY:** Install and use `framer-motion` for all UI interactions. Wrap the Next.js App Router layout in an `AnimatePresence`.
  - **Page Transitions:** Smooth fade and slight vertical slide when navigating between routes (e.g., from `/anime` to `/anime/[id]`).
  - **Scroll Reveals:** Grid items (Anime cards, Wallpapers, App links) should stagger-fade-in as the user scrolls down the page.
  - **Micro-interactions:** \* Hovering over an anime card should slightly scale it up (`scale: 1.05`), increase the intensity of the glassmorphism blur, and glow with a purple drop-shadow.
    - Buttons ("Watch on App") should have a magnetic hover effect or a sweeping light-reflection animation.

---

## 🚀 Core Modules & Requirements

### 1. The Anime Directory (API Integration)

Acts as an informational hub to drive traffic to the Mugenstream mobile apps.

- **Data Source:** Fetches data from existing external APIs.
- **Routes:**
  - `/anime`: Grid of latest and trending anime.
  - `/anime/schedule`: Weekly release calendar.
  - `/anime/[id]`: Detailed view (Synopsis, Poster, Rating, Genres, Cast).
- **Conversion Mechanism:** No embedded video players. The primary Call-to-Action (CTA) is a "Watch on App" / "Download to Watch" button that redirects to the App Showcase section or deep-links to the mobile app.
- **SEO:** Server-side fetching to populate dynamic Open Graph (OG) meta tags via Next.js `generateMetadata`.

### 2. App Showcase Directory

- **Route:** `/apps`
- **Function:** Display application cards with details and download links.
- **Features:**
  - Dynamic buttons with proper icons (PlayStore, Android APK, iOS App Store).
  - Clear metadata (Version, File Size, Last Updated) to comply with Google's "Unwanted Software" policy.

### 3. AI-Powered Anime News Blog

- **Routes:** `/blog`, `/blog/[slug]`, `/blog/category/[slug]`
- **CMS Dashboard:** A protected route (`/admin`) for users with `AUTHOR` or `ADMIN` roles to manually write, edit, and categorize posts.
- **AI Automation:** A background cron job that fetches trending anime news, passes it to an LLM (e.g., Gemini API) with a strict prompt to synthesize SEO-friendly articles, auto-generate tags/categories, and insert internal links, then pushes directly to the database.

### 4. Live & Image Wallpaper Gallery

- **Routes:** `/wallpapers`, `/wallpapers/[id]`
- **Function:** Infinite scroll gallery for users to download high-quality assets.
- **Features:**
  - Supports both `IMAGE` and `VIDEO` (Live Wallpapers - loops on hover).
  - User uploads routed through Supabase Storage.
  - Categorization and tagging system.

### 5. AdSense Compliance & Monetization

- **Ad Strategy:** Next.js `<Script>` integration (`strategy="afterInteractive"`) for ad units fixed within the glassmorphism layout to prevent accidental clicks.
- **Compliance Infrastructure:**
  - Cookie Consent Banner (GDPR/CPRA).
  - **Mandatory Pages:** `/privacy-policy`, `/terms-of-service`, `/about`, `/contact`.
  - **DMCA System:** `/dmca` page and a "Report Copyright" flag on every single wallpaper detail page to ensure safe harbor compliance.

---

## 🗄️ Database Blueprint (Prisma Schema Reference)

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: [https://pris.ly/d/prisma-schema](https://pris.ly/d/prisma-schema)

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// --- USERS & AUTH ---
model User {
  id         String      @id @default(uuid())
  email      String      @unique
  role       Role        @default(USER)
  posts      Post[]
  wallpapers Wallpaper[]
  created_at DateTime    @default(now())
}

enum Role {
  USER
  AUTHOR
  ADMIN
}

// --- APP SHOWCASE ---
model App {
  id                   String    @id @default(uuid())
  name                 String
  description          String
  logo_url             String
  version              String?
  file_size            String?
  last_updated         DateTime?
  is_primary_anime_app Boolean   @default(false)
  links                AppLink[]
}

model AppLink {
  id        String @id @default(uuid())
  app_id    String
  app       App    @relation(fields: [app_id], references: [id], onDelete: Cascade)
  platform  String // "PlayStore", "APK", "iOS"
  url       String
  icon_type String
}

// --- BLOG CMS ---
model Post {
  id          String     @id @default(uuid())
  title       String
  slug        String     @unique
  summary     String
  content     String     // Rich text or Markdown
  author_id   String
  author      User       @relation(fields: [author_id], references: [id])
  published   Boolean    @default(false)
  created_at  DateTime   @default(now())
  categories  Category[]
  tags        Tag[]
  seo_meta    SeoMeta?
}

model Category {
  id    String @id @default(uuid())
  name  String @unique
  slug  String @unique
  posts Post[]
}

model Tag {
  id    String @id @default(uuid())
  name  String @unique
  slug  String @unique
  posts Post[]
}

model SeoMeta {
  id               String  @id @default(uuid())
  post_id          String  @unique
  post             Post    @relation(fields: [post_id], references: [id], onDelete: Cascade)
  meta_title       String
  meta_description String
  og_image_url     String?
}

// --- WALLPAPERS ---
model Wallpaper {
  id              String         @id @default(uuid())
  title           String
  file_url        String
  type            WallpaperType
  uploader_id     String
  uploader        User           @relation(fields: [uploader_id], references: [id])
  downloads_count Int            @default(0)
  created_at      DateTime       @default(now())
  tags            WallpaperTag[]
}

enum WallpaperType {
  IMAGE
  VIDEO
}

model WallpaperTag {
  id         String      @id @default(uuid())
  name       String      @unique
  slug       String      @unique
  wallpapers Wallpaper[]
}
```

## 🤖 Detailed Implementation Instructions for Claude

Please execute the development of this project strictly in the following sequence. Wait for my confirmation or feedback after completing each phase before moving to the next.

### **Phase 1: Project Initialization & "The Kinetic Canvas" Setup**

**Objective:** Scaffold the Next.js App Router and configure the global styling system to perfectly match the dark, glassmorphic aesthetic.

1.  **Initialize:** Create the Next.js app using `npx create-next-app@latest` (use TypeScript, Tailwind CSS, App Router, and ESLint).
2.  **Typography:** Utilize `next/font/google` to import **Epilogue** (for headings) and **Inter** (for body text). Apply `Inter` as the default font on the `<body>` tag.
3.  **Tailwind Configuration (`tailwind.config.ts`):**
    - Set the core background color to `#0b0416`.
    - Define primary accent colors: Neon Purple (`#8B5CF6`) and Magenta (`#D946EF`).
    - Extend the theme to include custom box shadows for glowing effects (e.g., `box-shadow: 0 0 15px rgba(139, 92, 246, 0.5)`).
4.  **Global Styles (`globals.css`):** Create global utility classes for the glassmorphism effect (e.g., `.glass-panel` combining `bg-purple-900/10`, `backdrop-blur-md`, and `border border-white/5`).

### **Phase 2: Database & API Infrastructure Setup**

**Objective:** Connect the application to Supabase using Prisma and establish the backend routes.

1.  **Prisma Initialization:** Install `@prisma/client` and `prisma` as a dev dependency. Run `npx prisma init`.
2.  **Schema Application:** Replace the default `schema.prisma` with the comprehensive schema provided in this document. Configure the `DATABASE_URL` and `DIRECT_URL` in `.env` for Supabase connection pooling.
3.  **Database Migration:** Run the appropriate Prisma commands to push the schema to the Supabase PostgreSQL database and generate the Prisma Client.
4.  **Core API Handlers:** Scaffold standard Next.js Route Handlers (`app/api/...`) for basic database interactions to ensure the Prisma client is functioning correctly within the App Router environment.

### **Phase 3: UI Component Library & Framer Motion Integration**

**Objective:** Build the reusable, animated UI building blocks before assembling full pages.

1.  **Install Framer Motion:** `npm install framer-motion`.
2.  **Page Transitions:** Create a client-side wrapper component using `<AnimatePresence>` and `<motion.div>` to implement smooth fade and slight vertical slide transitions for all route changes. Apply this in `template.tsx` or `layout.tsx`.
3.  **Build Reusable Components:**
    - **`GlassCard`:** A wrapper component that applies the glassmorphism CSS defined in Phase 1, combined with a `motion.div` hover effect that slightly scales up (`scale: 1.02`) and brightens the border.
    - **`AnimatedButton`:** A primary CTA button that utilizes the neon purple/magenta accents with a hover animation (e.g., a sweeping light reflection or a pulsing glow).
    - **`SectionHeader`:** A reusable heading component utilizing the Epilogue font.

### **Phase 4: The Anime Directory & SEO Implementation**

**Objective:** Build the frontend interfaces that consume the external anime APIs, prioritizing search engine visibility.

1.  **API Utility:** Create a server-side fetching utility function in a `lib` or `utils` folder to call the external Mugenstream/Animekai APIs securely. Ensure Next.js caching is configured correctly (e.g., `next: { revalidate: 3600 }`).
2.  **Grid Layouts:** Build the `/anime` and `/anime/schedule` pages using the `GlassCard` components in a responsive CSS Grid. Implement a stagger-fade-in animation using Framer Motion as the grid renders.
3.  **Dynamic Details Page (`/anime/[id]`):**
    - Build the UI featuring a blurred background banner, the clear poster, and metadata.
    - Integrate the `AnimatedButton` component for the "Watch on App" CTA.
4.  **SEO Automation:** Strictly implement the `generateMetadata` function exported from `/anime/[id]/page.tsx`. It must fetch the specific anime details and dynamically generate the `<title>`, `<meta name="description">`, and Open Graph image tags based on the API response.

### **Phase 5: App Showcase & AdSense Compliance Pages**

**Objective:** Finalize the secondary features and ensure the site meets all Google Publisher Policies.

1.  **Compliance Pages:** Scaffold clean, static, text-heavy pages wrapped in a `GlassCard` container for `/privacy-policy`, `/terms-of-service`, `/about`, and `/contact`.
2.  **DMCA System:** Build the `/dmca` page. (If requested, also build a simple client-side form using a Server Action to allow users to submit takedown requests).
3.  **App Showcase (`/apps`):** Build a server component that queries Prisma for the `App` and `AppLink` models. Map these to the UI, ensuring that App metadata (Version, Size, Last Updated) is clearly visible to comply with AdSense "Unwanted Software" policies.
4.  **Ad Placement Strategy:** Create a placeholder `<AdUnit />` component that utilizes the Next.js `<Script strategy="afterInteractive">` tag. Place this strategically in the layout (e.g., below the header or between grid sections) ensuring it never overlaps content.

5.  Install ORM
    Add the ORM to your project.
    Code:
    File: Code

```
npm install prisma --save-dev
```

File: Code

```
npx prisma init
```

2. Configure ORM
   Set up your ORM configuration.
   Code:
   File: .env.local

```
# Connect to Supabase via connection pooling
DATABASE_URL="postgresql://postgres.gtvirgriomnnojhcucix:7815WorkE@rn@aws-1-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct connection to the database. Used for migrations
DIRECT_URL="postgresql://postgres.gtvirgriomnnojhcucix:7815WorkE@rn@aws-1-us-west-1.pooler.supabase.com:5432/postgres"
```

File: prisma/schema.prisma

```
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

3. Install Agent Skills (Optional)
   Agent Skills give AI coding tools ready-made instructions, scripts, and resources for working with Supabase more accurately and efficiently.
   Details:
   npx skills add supabase/agent-skills
   Code:
   File: Code

```
npx skills add supabase/agent-skills
```

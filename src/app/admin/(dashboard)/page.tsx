import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  const session = await auth();
  const user = session?.user ?? null;

  const [
    appCountResult,
    postCountResult,
    publishedCountResult,
    wallpaperCountResult,
    downloadSumResult,
    recentPostsResult,
  ] = await Promise.allSettled([
    prisma.app.count(),
    prisma.post.count(),
    prisma.post.count({ where: { published: true } }),
    prisma.wallpaper.count(),
    prisma.wallpaper.aggregate({ _sum: { downloadsCount: true } }),
    prisma.post.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, published: true, createdAt: true, slug: true },
    }),
  ]);

  const appCount = appCountResult.status === "fulfilled" ? appCountResult.value : 0;
  const postCount = postCountResult.status === "fulfilled" ? postCountResult.value : 0;
  const publishedCount = publishedCountResult.status === "fulfilled" ? publishedCountResult.value : 0;
  const wallpaperCount = wallpaperCountResult.status === "fulfilled" ? wallpaperCountResult.value : 0;
  const totalDownloads =
    downloadSumResult.status === "fulfilled"
      ? (downloadSumResult.value._sum.downloadsCount ?? 0)
      : 0;
  const recentPosts =
    recentPostsResult.status === "fulfilled" ? recentPostsResult.value : [];

  const firstName = user?.email?.split("@")[0] ?? "Admin";

  const STATS = [
    {
      label: "Apps",
      value: appCount,
      sub: "in showcase",
      href: "/admin/apps",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 8.25h3m-3 3h3m-3 3h3" />
        </svg>
      ),
      color: "text-secondary",
      border: "border-secondary/15",
      bg: "bg-secondary/8",
      glow: "hover:shadow-[0_0_25px_rgba(253,118,26,0.1)]",
    },
    {
      label: "All Posts",
      value: postCount,
      sub: `${postCount - publishedCount} draft`,
      href: "/admin/posts",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
      ),
      color: "text-primary",
      border: "border-primary/15",
      bg: "bg-primary/8",
      glow: "hover:shadow-[0_0_25px_rgba(186,158,255,0.1)]",
    },
    {
      label: "Published",
      value: publishedCount,
      sub: `${postCount > 0 ? Math.round((publishedCount / postCount) * 100) : 0}% of posts`,
      href: "/admin/posts",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
      color: "text-green-400",
      border: "border-green-400/15",
      bg: "bg-green-400/8",
      glow: "hover:shadow-[0_0_25px_rgba(74,222,128,0.1)]",
    },
    {
      label: "Wallpapers",
      value: wallpaperCount,
      sub: `${totalDownloads.toLocaleString()} downloads`,
      href: "/admin/wallpapers",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
        </svg>
      ),
      color: "text-tertiary",
      border: "border-tertiary/15",
      bg: "bg-tertiary/8",
      glow: "hover:shadow-[0_0_25px_rgba(97,194,255,0.1)]",
    },
  ];

  const QUICK_ACTIONS = [
    {
      href: "/admin/posts/new",
      label: "New Post",
      desc: "Write or AI-generate an article",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      ),
      accent: "text-primary",
      border: "border-primary/15 hover:border-primary/30",
    },
    {
      href: "/admin/wallpapers",
      label: "Upload Wallpaper",
      desc: "Add images or video wallpapers",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
        </svg>
      ),
      accent: "text-tertiary",
      border: "border-tertiary/15 hover:border-tertiary/30",
    },
    {
      href: "/admin/apps",
      label: "Add App",
      desc: "Publish a new app to the showcase",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0 4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0-5.571 3-5.571-3" />
        </svg>
      ),
      accent: "text-secondary",
      border: "border-secondary/15 hover:border-secondary/30",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold text-text-main">
            Good day, <span className="text-gradient-primary">{firstName}</span>
          </h1>
          <p className="font-body text-text-main/40 mt-1 text-sm">
            Here's what's happening with your site today.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 liquid-glass rounded-full border border-outline-variant/10">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="font-body text-xs text-text-main/40">Site online</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {STATS.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className={`group liquid-glass rounded-2xl p-6 border ${s.border} ${s.glow} transition-all duration-300 cursor-pointer`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-2 rounded-xl ${s.bg} ${s.color}`}>
                {s.icon}
              </div>
              <svg
                className="w-4 h-4 text-text-main/20 group-hover:text-text-main/40 transition-colors"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </div>
            <p className={`font-headline text-3xl font-bold ${s.color} mb-1`}>{s.value}</p>
            <p className="font-body text-text-main/60 text-sm font-medium">{s.label}</p>
            <p className="font-body text-text-main/30 text-xs mt-0.5">{s.sub}</p>
          </Link>
        ))}
      </div>

      {/* Bottom row: recent posts + quick actions */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Recent posts — wider */}
        <div className="lg:col-span-3 liquid-glass rounded-2xl border border-outline-variant/10 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10">
            <h2 className="font-headline text-base font-semibold text-text-main">Recent Posts</h2>
            <Link
              href="/admin/posts"
              className="font-body text-xs text-primary/70 hover:text-primary transition-colors"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-outline-variant/8">
            {recentPosts.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="font-body text-text-main/30 text-sm">No posts yet.</p>
                <Link href="/admin/posts/new" className="font-body text-xs text-primary hover:underline mt-2 inline-block">
                  Create your first post
                </Link>
              </div>
            ) : (
              recentPosts.map((post) => (
                <div key={post.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-surface-high/20 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm text-text-main/80 truncate font-medium">{post.title}</p>
                    <p className="font-body text-xs text-text-main/30 mt-0.5">
                      {new Date(post.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full font-body text-[10px] font-semibold ${
                      post.published
                        ? "bg-green-400/10 text-green-400"
                        : "bg-outline-variant/15 text-text-main/35"
                    }`}
                  >
                    {post.published ? "Published" : "Draft"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="font-headline text-base font-semibold text-text-main px-1">Quick Actions</h2>
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className={`flex items-center gap-4 p-4 liquid-glass rounded-xl border ${a.border} transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] cursor-pointer`}
            >
              <div className={`p-2 rounded-lg bg-outline-variant/10 ${a.accent} shrink-0`}>
                {a.icon}
              </div>
              <div className="min-w-0">
                <p className="font-body text-sm font-semibold text-text-main">{a.label}</p>
                <p className="font-body text-xs text-text-main/35 truncate">{a.desc}</p>
              </div>
              <svg className="w-4 h-4 text-text-main/20 shrink-0 ml-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Link>
          ))}

          {/* Site health indicator */}
          <div className="p-4 liquid-glass rounded-xl border border-outline-variant/10 mt-2">
            <p className="font-body text-xs text-text-main/30 uppercase tracking-widest mb-3">Content Health</p>
            <div className="space-y-2.5">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-body text-xs text-text-main/50">Posts published</span>
                  <span className="font-body text-xs text-text-main/50">
                    {postCount > 0 ? Math.round((publishedCount / postCount) * 100) : 0}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-high overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-tertiary rounded-full transition-all duration-500"
                    style={{ width: `${postCount > 0 ? (publishedCount / postCount) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-body text-xs text-text-main/50">Wallpaper downloads</span>
                  <span className="font-body text-xs text-text-main/50">{totalDownloads.toLocaleString()}</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-high overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-tertiary to-primary rounded-full"
                    style={{ width: totalDownloads > 0 ? "100%" : "0%" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

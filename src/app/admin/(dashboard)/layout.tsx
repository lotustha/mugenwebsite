import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import AdminNav from "@/components/AdminNav";
import AdminBottomNav from "@/components/AdminBottomNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const handleSignOut = async () => {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/admin/login");
  };

  const initials  = user.email ? user.email.slice(0, 2).toUpperCase() : "AD";
  const userEmail = user.email ?? "";

  return (
    <div className="min-h-screen flex bg-background">

      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <aside className="hidden md:flex w-64 flex-none flex-col relative"
        style={{
          background: "linear-gradient(180deg, rgba(9,19,40,0.95) 0%, rgba(6,14,32,0.98) 100%)",
          borderRight: "1px solid rgba(64,72,93,0.2)",
          backdropFilter: "blur(20px) saturate(160%)",
        }}>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        <div className="px-5 py-6 border-b border-outline-variant/10">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/40 to-primary-dim/60 flex items-center justify-center border border-primary/20">
              <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            </div>
            <div>
              <p className="font-headline text-base font-bold text-primary leading-none">Mugen</p>
              <p className="font-body text-text-main/35 text-[10px] mt-0.5">Admin Panel</p>
            </div>
          </Link>
        </div>

        <div className="px-5 pt-5 pb-2">
          <p className="font-body text-[10px] text-text-main/25 uppercase tracking-widest font-semibold">Navigation</p>
        </div>

        <AdminNav />

        <div className="p-3 border-t border-outline-variant/10 mt-auto">
          <div className="liquid-glass rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-tertiary/30 border border-primary/20 flex items-center justify-center shrink-0">
              <span className="font-headline text-xs font-bold text-primary">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-body text-text-main/70 text-xs truncate">{userEmail}</p>
              <p className="font-body text-text-main/30 text-[10px]">Administrator</p>
            </div>
            <form action={handleSignOut}>
              <button type="submit" title="Sign out"
                className="p-1.5 rounded-lg text-text-main/30 hover:text-red-400 hover:bg-red-400/10 transition-colors cursor-pointer">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* ── Main content area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Desktop top header */}
        <header className="hidden md:flex h-14 items-center px-8 border-b border-outline-variant/10 shrink-0"
          style={{ background: "rgba(6,14,32,0.8)", backdropFilter: "blur(16px)" }}>
          <div className="flex-1" />
          <Link href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 liquid-glass rounded-lg font-body text-xs text-text-main/60 hover:text-text-main transition-colors cursor-pointer border border-outline-variant/10 hover:border-primary/20">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            View Site
          </Link>
        </header>

        {/* Mobile top header */}
        <header className="flex md:hidden h-14 items-center px-4 shrink-0 sticky top-0 z-30"
          style={{ background: "rgba(6,10,24,0.95)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/50 to-primary-dim/70 flex items-center justify-center border border-primary/20">
              <svg className="w-3.5 h-3.5 text-primary" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            </div>
            <span className="font-headline text-sm font-bold text-primary">Mugen Admin</span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <Link href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-body text-xs cursor-pointer transition-all"
              style={{ color: "rgba(222,229,255,0.4)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 2H3.5A1.5 1.5 0 0 0 2 3.5v9A1.5 1.5 0 0 0 3.5 14H10a1.5 1.5 0 0 0 1.5-1.5V9"/>
                <path strokeLinecap="round" d="M7 9l5-5M8 4h4v4"/>
              </svg>
              Site
            </Link>
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-tertiary/30 border border-primary/20 flex items-center justify-center">
              <span className="font-headline text-xs font-bold text-primary">{initials}</span>
            </div>
          </div>
        </header>

        {/* Content — reduced padding on mobile, pb for bottom nav */}
        <main className="flex-1 overflow-auto p-4 md:p-8 pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <AdminBottomNav userEmail={userEmail} />
    </div>
  );
}

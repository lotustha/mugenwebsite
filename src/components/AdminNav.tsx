"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_SECTIONS = [
  {
    label: "Content",
    items: [
      {
        href: "/admin",
        label: "Dashboard",
        exact: true,
        icon: <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
      },
      {
        href: "/admin/posts",
        label: "Posts",
        icon: <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9"/><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
      },
      {
        href: "/admin/wallpapers",
        label: "Wallpapers",
        icon: <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
      },
      {
        href: "/admin/apps",
        label: "Apps",
        icon: <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18h3"/></svg>,
      },
      {
        href: "/admin/categories",
        label: "Categories",
        icon: <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18"/></svg>,
      },
      {
        href: "/admin/tags",
        label: "Tags",
        icon: <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>,
      },
      {
        href: "/admin/wallpaper-categories",
        label: "W. Categories",
        icon: <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"/><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z"/></svg>,
      },
    ],
  },
  {
    label: "Engagement",
    items: [
      {
        href: "/admin/in-app-messages",
        label: "In-App Messages",
        icon: <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/></svg>,
      },
      {
        href: "/admin/autopilot",
        label: "AI Autopilot",
        icon: <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3z"/><path strokeLinecap="round" strokeLinejoin="round" d="M18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9L18 15z"/></svg>,
      },
      {
        href: "/admin/rss",
        label: "RSS Import",
        icon: <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="5" cy="19" r="2"/><path strokeLinecap="round" d="M5 11a8 8 0 018 8"/><path strokeLinecap="round" d="M5 6a13 13 0 0113 13"/></svg>,
      },
      {
        href: "/admin/wallpaper-sources",
        label: "Wallpaper Auto",
        icon: <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path strokeLinecap="round" strokeLinejoin="round" d="M21 15l-5-5L9 17"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-4m0 0l-1.5 1.5M12 17l1.5 1.5"/></svg>,
      },
    ],
  },
  {
    label: "Revenue",
    items: [
      {
        href: "/admin/income",
        label: "Ad Revenue",
        icon: <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
        badge: "NEW",
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        href: "/admin/settings",
        label: "Settings",
        icon: <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z"/><circle cx="12" cy="12" r="3"/></svg>,
      },
    ],
  },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
      {NAV_SECTIONS.map((section) => (
        <div key={section.label}>
          <p className="px-3 mb-1 font-body text-[0.5625rem] uppercase tracking-widest font-semibold"
            style={{ color: "rgba(222,229,255,0.2)" }}>
            {section.label}
          </p>
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const isActive = "exact" in item && item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-body text-sm transition-all duration-200 ${
                    isActive
                      ? "bg-primary/15 text-primary border border-primary/20"
                      : "text-text-main/55 hover:text-text-main hover:bg-surface-high/40 border border-transparent"
                  }`}
                >
                  <span className={isActive ? "text-primary" : "text-text-main/40"}>
                    {item.icon}
                  </span>
                  <span className="flex-1">{item.label}</span>
                  {"badge" in item && item.badge && !isActive && (
                    <span className="font-body text-[0.5rem] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: "rgba(16,185,129,0.15)", color: "#34d399" }}>
                      {item.badge}
                    </span>
                  )}
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-primary flex-none" />}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

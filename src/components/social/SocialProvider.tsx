"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { CurrentUser } from "@/lib/social-client";
import { fetchMe, ping } from "@/lib/social-client";

interface SocialContextValue {
  user: CurrentUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const SocialContext = createContext<SocialContextValue>({
  user: null,
  loading: true,
  refresh: async () => {},
});

/** Provides the current signed-in user to the social surface (web cookie session). */
export function SocialProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setUser(await fetchMe());
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await fetchMe();
        if (!cancelled) setUser(me);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Presence heartbeat: ping while signed in and the tab is visible.
  useEffect(() => {
    if (!user) return;
    const beat = () => {
      if (document.visibilityState === "visible") void ping();
    };
    beat();
    const id = window.setInterval(beat, 60_000);
    document.addEventListener("visibilitychange", beat);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", beat);
    };
  }, [user]);

  return <SocialContext.Provider value={{ user, loading, refresh }}>{children}</SocialContext.Provider>;
}

export function useCurrentUser(): SocialContextValue {
  return useContext(SocialContext);
}

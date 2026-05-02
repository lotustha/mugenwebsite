import { fetchWithTimeout } from "./fetcher";

function getBaseUrl() {
  if (typeof window !== "undefined") return ""; // Browser should use relative path
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  return "http://localhost:3000"; // Fallback
}

const API_BASE = "/api/anime";

export async function getSpotlight(): Promise<any[]> {
  try {
    const url = `${getBaseUrl()}${API_BASE}/spotlight`;
    const res = await fetchWithTimeout(url, {
      next: { revalidate: 3600 },
      timeout: 6000,
    });
    
    if (!res.ok) {
      throw new Error("Failed to fetch spotlight");
    }
    
    const data = await res.json();
    return Array.isArray(data) ? data : data?.results ?? data?.data ?? [];
  } catch (error) {
    console.error("getSpotlight error:", error);
    return [];
  }
}

export async function getRecentAdded(): Promise<any[]> {
  try {
    const url = `${getBaseUrl()}${API_BASE}/recent`;
    const res = await fetchWithTimeout(url, {
      next: { revalidate: 3600 },
      timeout: 6000,
    });
    
    if (!res.ok) {
      throw new Error("Failed to fetch recent added");
    }
    
    const data = await res.json();
    return Array.isArray(data) ? data : data?.results ?? data?.data ?? [];
  } catch (error) {
    console.error("getRecentAdded error:", error);
    return [];
  }
}

export async function getNewReleases(): Promise<any[]> {
  try {
    const url = `${getBaseUrl()}${API_BASE}/new`;
    const res = await fetchWithTimeout(url, {
      next: { revalidate: 3600 },
      timeout: 6000,
    });
    
    if (!res.ok) {
      throw new Error("Failed to fetch new releases");
    }
    
    const data = await res.json();
    return Array.isArray(data) ? data : data?.results ?? data?.data ?? [];
  } catch (error) {
    console.error("getNewReleases error:", error);
    return [];
  }
}

export async function getSearchSuggestions(query: string): Promise<any[]> {
  try {
    const url = `${getBaseUrl()}${API_BASE}/search?query=${encodeURIComponent(query)}`;
    const res = await fetchWithTimeout(url, { timeout: 5000 });
    
    if (!res.ok) {
      throw new Error("Failed to fetch suggestions");
    }
    
    const data = await res.json();
    return Array.isArray(data) ? data : data?.results ?? data?.data ?? [];
  } catch (error) {
    console.error("getSearchSuggestions error:", error);
    return [];
  }
}

export async function getAnimeInfo(id: string): Promise<any> {
  try {
    const url = `${getBaseUrl()}${API_BASE}/info?id=${encodeURIComponent(id)}`;
    const res = await fetchWithTimeout(url, { timeout: 5000 });
    
    if (!res.ok) {
      throw new Error("Failed to fetch anime info");
    }
    
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("getAnimeInfo error:", error);
    return null;
  }
}

export async function trackClick(source: string, animeId?: string): Promise<boolean> {
  try {
    const res = await fetch("/api/track-click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, animeId }),
    });
    
    return res.ok;
  } catch {
    return false;
  }
}

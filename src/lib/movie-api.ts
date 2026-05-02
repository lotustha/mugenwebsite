import { fetchWithTimeout } from "./fetcher";

function getBaseUrl() {
  if (typeof window !== "undefined") return ""; // Browser should use relative path
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  return "http://localhost:3000"; // Fallback
}

const MOVIE_API_BASE = "/api/movies";

export async function getMoviesHome(): Promise<any> {
  try {
    const url = `${getBaseUrl()}${MOVIE_API_BASE}/home`;
    const res = await fetchWithTimeout(url, { next: { revalidate: 3600 }, timeout: 6000 });
    if (!res.ok) throw new Error("Failed to fetch movies home");
    return await res.json();
  } catch (error) {
    console.error("getMoviesHome error:", error);
    return null;
  }
}

export async function getPopularMovies(): Promise<any[]> {
  try {
    const url = `${getBaseUrl()}${MOVIE_API_BASE}/category?type=movies&category=popular`;
    const res = await fetchWithTimeout(url, { next: { revalidate: 3600 }, timeout: 6000 });
    if (!res.ok) throw new Error("Failed to fetch popular movies");
    const data = await res.json();
    return Array.isArray(data) ? data : data?.results ?? data?.data ?? [];
  } catch (error) {
    console.error("getPopularMovies error:", error);
    return [];
  }
}

export async function getTopRatedMovies(): Promise<any[]> {
  try {
    const url = `${getBaseUrl()}${MOVIE_API_BASE}/category?type=movies&category=top-rated`;
    const res = await fetchWithTimeout(url, { next: { revalidate: 3600 }, timeout: 6000 });
    if (!res.ok) throw new Error("Failed to fetch top-rated movies");
    const data = await res.json();
    return Array.isArray(data) ? data : data?.results ?? data?.data ?? [];
  } catch (error) {
    console.error("getTopRatedMovies error:", error);
    return [];
  }
}

export async function getPopularTV(): Promise<any[]> {
  try {
    const url = `${getBaseUrl()}${MOVIE_API_BASE}/category?type=tv&category=popular`;
    const res = await fetchWithTimeout(url, { next: { revalidate: 3600 }, timeout: 6000 });
    if (!res.ok) throw new Error("Failed to fetch popular TV");
    const data = await res.json();
    return Array.isArray(data) ? data : data?.results ?? data?.data ?? [];
  } catch (error) {
    console.error("getPopularTV error:", error);
    return [];
  }
}

export async function searchMovies(query: string): Promise<any[]> {
  try {
    const url = `${getBaseUrl()}${MOVIE_API_BASE}/search?q=${encodeURIComponent(query)}`;
    const res = await fetchWithTimeout(url, { timeout: 5000 });
    if (!res.ok) throw new Error("Failed to search movies");
    const data = await res.json();
    return Array.isArray(data) ? data : data?.results ?? data?.data ?? [];
  } catch (error) {
    console.error("searchMovies error:", error);
    return [];
  }
}

export async function getMovieInfo(id: string): Promise<any> {
  try {
    const url = `${getBaseUrl()}${MOVIE_API_BASE}/info?id=${encodeURIComponent(id)}`;
    const res = await fetchWithTimeout(url, { timeout: 5000 });
    if (!res.ok) throw new Error("Failed to fetch movie info");
    return await res.json();
  } catch (error) {
    console.error("getMovieInfo error:", error);
    return null;
  }
}

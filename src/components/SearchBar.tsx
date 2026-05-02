"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { getSearchSuggestions } from "@/lib/api";

interface SearchResult {
  id: string;
  title: string;
  image: string;
}

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const debouncedSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const data = await getSearchSuggestions(searchQuery);
      setResults(data.slice(0, 6));
      setIsOpen(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      debouncedSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, debouncedSearch]);

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search anime..."
          className="w-full px-4 py-2 bg-surface border border-outline-variant/15 rounded-md font-body text-text-main placeholder:text-text-main/40 focus:outline-none focus:border-primary/50"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-surface-high rounded-md shadow-xl z-50 overflow-hidden">
          {results.map((anime) => (
            <Link
              key={anime.id}
              href={`/anime/${anime.id}`}
              onClick={() => {
                setIsOpen(false);
                setQuery("");
              }}
              className="flex items-center gap-3 p-3 hover:bg-surface transition-colors"
            >
              <div className="relative w-12 h-16 flex-none rounded overflow-hidden">
                {anime.image ? (
                  <Image
                    src={anime.image}
                    alt={anime.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-surface" />
                )}
              </div>
              <span className="font-body text-text-main truncate">{anime.title}</span>
            </Link>
          ))}
        </div>
      )}

      {isOpen && query.length >= 2 && results.length === 0 && !loading && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-surface-high rounded-md shadow-xl z-50 p-4">
          <p className="font-body text-text-main/60 text-center">No results found</p>
        </div>
      )}
    </div>
  );
}

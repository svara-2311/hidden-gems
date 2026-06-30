"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Bookmark, Map } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { FilterPanel, type Filters } from "@/components/FilterPanel";
import { ResultsGrid, LoadingGrid } from "@/components/ResultsGrid";
import { CoffeeCupIllustration } from "@/components/illustrations";
import { cn } from "@/lib/cn";
import { useSavedGemsCount } from "@/lib/savedGems";
import type { SearchResult } from "@/types";

const EMPTY_FILTERS: Filters = { areas: [], vibes: [], drinks: [] };

// A short human label for a filter-only search (shown as the results heading).
function describeFilters(filters: Filters): string {
  const parts = [...filters.vibes, ...filters.drinks, ...filters.areas];
  return parts.length ? parts.join(" · ") : "your filters";
}

export default function Home() {
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const savedCount = useSavedGemsCount();

  const handleSearch = async () => {
    const trimmedQuery = query.trim();
    const hasFilters =
      filters.areas.length > 0 || filters.vibes.length > 0 || filters.drinks.length > 0;

    if (!trimmedQuery && !hasFilters) {
      setError("Enter a search or pick at least one filter.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setActiveQuery(trimmedQuery || describeFilters(filters));
    setResults(null);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: trimmedQuery || undefined,
          areas: filters.areas,
          vibes: filters.vibes,
          drinks: filters.drinks,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Search failed");
      }

      setResults(data.results);
      // Scroll to results on mobile
      setTimeout(
        () => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        100
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const hasResults = Array.isArray(results) && results.length > 0;
  const compact = hasResults || isLoading;

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-cream">
      {/* Top-right nav */}
      <div className="absolute top-4 right-4 z-10 sm:top-6 sm:right-6 flex items-center gap-2">
        <Link
          href="/map"
          className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-stone-500 transition-colors duration-150 hover:border-stone-950 hover:text-stone-950"
        >
          <Map className="h-3 w-3" />
          Map
        </Link>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors duration-150",
            savedCount > 0
              ? "border-rust/40 bg-rust/10 text-rust"
              : "border-stone-300 bg-white text-stone-500"
          )}
        >
          <Bookmark className="h-3 w-3" fill={savedCount > 0 ? "currentColor" : "none"} />
          {savedCount} saved
        </span>
      </div>

      {/* Hero / search section */}
      <section
        className={cn(
          "relative flex flex-col items-center px-4 transition-all duration-700 ease-in-out",
          compact ? "pt-8 pb-8" : "pt-16 sm:pt-28 pb-16 min-h-[65vh] justify-center"
        )}
      >
        {/* Wordmark */}
        <div
          className={cn(
            "text-center transition-all duration-500",
            compact ? "mb-6" : "mb-10"
          )}
        >
          <div className="inline-flex items-center gap-2.5 mb-3">
            <CoffeeCupIllustration className="h-6 w-6 text-stone-950" />
            <span className="text-[11px] uppercase tracking-[0.35em] text-stone-950 font-sans font-bold">
              hidden gems
            </span>
          </div>

          <h1
            className={cn(
              "font-serif font-bold text-stone-950 leading-[1.1] tracking-tight transition-all duration-500 text-balance",
              compact ? "text-3xl sm:text-4xl" : "text-4xl sm:text-6xl lg:text-7xl"
            )}
          >
            Find your coffee spot.
          </h1>

          {!compact && (
            <p className="mt-4 text-stone-600 text-base sm:text-lg max-w-sm mx-auto leading-relaxed animate-fade-in">
              Describe the vibe. We&rsquo;ll find the right corner of the Bay.
            </p>
          )}
        </div>

        <SearchBar
          value={query}
          onChange={setQuery}
          onSearch={handleSearch}
          isLoading={isLoading}
        />

        <div className="mt-4 w-full">
          <FilterPanel
            filters={filters}
            onChange={setFilters}
            onSearch={handleSearch}
            isLoading={isLoading}
          />
        </div>
      </section>

      {/* Results section */}
      <section
        ref={resultsRef}
        className="relative px-4 sm:px-6 pb-24 max-w-6xl mx-auto"
      >
        {isLoading && <LoadingGrid />}

        {!isLoading && hasResults && (
          <ResultsGrid results={results!} query={activeQuery} />
        )}

        {!isLoading && results !== null && results.length === 0 && (
          <div className="text-center py-20 animate-fade-in">
            <p className="text-stone-700 text-lg font-serif font-bold">
              No gems match that combination.
            </p>
            <p className="text-stone-500 text-sm mt-2">
              Try loosening a filter — fewer areas, vibes, or drink types — or
              rephrase your search.
            </p>
          </div>
        )}

        {!isLoading && error && (
          <div className="text-center py-20 animate-fade-in">
            <p className="text-stone-700">{error}</p>
            <p className="text-stone-500 text-xs mt-2">
              Make sure your .env.local is configured and the database is
              running.
            </p>
          </div>
        )}
      </section>

      {/* Footer */}
      {!compact && (
        <footer className="absolute bottom-6 left-0 right-0 text-center animate-fade-in">
          <p className="text-[11px] text-stone-400 font-bold tracking-wide uppercase">
            SF Bay Area &nbsp;·&nbsp; Vector search &nbsp;·&nbsp; AI-matched
          </p>
        </footer>
      )}
    </main>
  );
}

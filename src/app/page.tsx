"use client";

import { useState, useRef } from "react";
import { SearchBar } from "@/frontend/components/SearchBar";
import { ResultsGrid, LoadingGrid } from "@/frontend/components/ResultsGrid";
import { cn } from "@/frontend/lib/cn";
import type { SearchResult } from "@/shared/types";

// Subtle dot-grid background
const DOT_GRID = `radial-gradient(circle, rgb(68 64 60 / 0.4) 1px, transparent 1px)`;

export default function Home() {
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [activeQuery, setActiveQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleSearch = async (query: string) => {
    setIsLoading(true);
    setError(null);
    setActiveQuery(query);
    setResults(null);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
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
    <main className="relative min-h-screen overflow-x-hidden">
      {/* Background dot grid */}
      <div
        className="pointer-events-none fixed inset-0 opacity-100"
        style={{
          backgroundImage: DOT_GRID,
          backgroundSize: "28px 28px",
        }}
      />

      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-amber-950/20 blur-[120px]" />
      </div>

      {/* Hero / search section */}
      <section
        className={cn(
          "relative flex flex-col items-center px-4 transition-all duration-700 ease-in-out",
          compact ? "pt-10 pb-10" : "pt-28 pb-16 min-h-[65vh] justify-center"
        )}
      >
        {/* Wordmark */}
        <div
          className={cn(
            "text-center transition-all duration-500",
            compact ? "mb-7" : "mb-10"
          )}
        >
          <div className="inline-flex items-center gap-2.5 mb-2.5">
            <span className="text-amber-500/80 text-base select-none">◆</span>
            <span className="text-[11px] uppercase tracking-[0.35em] text-stone-500 font-sans font-medium">
              hidden gems
            </span>
            <span className="text-amber-500/80 text-base select-none">◆</span>
          </div>

          <h1
            className={cn(
              "font-serif text-stone-100 leading-[1.1] tracking-tight transition-all duration-500 text-balance",
              compact ? "text-3xl sm:text-4xl" : "text-5xl sm:text-6xl lg:text-7xl"
            )}
          >
            Find your coffee spot.
          </h1>

          {!compact && (
            <p className="mt-4 text-stone-500 text-base sm:text-lg max-w-sm mx-auto leading-relaxed animate-fade-in">
              Describe the vibe. We&rsquo;ll find the right corner of the Bay.
            </p>
          )}
        </div>

        <SearchBar onSearch={handleSearch} isLoading={isLoading} />
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
            <p className="text-stone-400 text-lg font-serif">
              No gems found for this vibe.
            </p>
            <p className="text-stone-600 text-sm mt-2">
              Try rephrasing — be more specific about lighting, noise, or
              coffee type.
            </p>
          </div>
        )}

        {!isLoading && error && (
          <div className="text-center py-20 animate-fade-in">
            <p className="text-stone-400">{error}</p>
            <p className="text-stone-600 text-xs mt-2">
              Make sure your .env.local is configured and the database is
              running.
            </p>
          </div>
        )}
      </section>

      {/* Footer */}
      {!compact && (
        <footer className="absolute bottom-6 left-0 right-0 text-center animate-fade-in">
          <p className="text-[11px] text-stone-700 tracking-wide">
            SF Bay Area &nbsp;·&nbsp; Vector search &nbsp;·&nbsp; AI-matched
          </p>
        </footer>
      )}
    </main>
  );
}

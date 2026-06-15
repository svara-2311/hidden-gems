"use client";

import { useState, useRef } from "react";
import { SearchBar } from "@/frontend/components/SearchBar";
import { ResultsGrid, LoadingGrid } from "@/frontend/components/ResultsGrid";
import { CoffeeCupIllustration } from "@/frontend/components/illustrations";
import { cn } from "@/frontend/lib/cn";
import type { SearchResult } from "@/shared/types";

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
    <main className="relative min-h-screen overflow-x-hidden bg-cream">
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
            <p className="text-stone-700 text-lg font-serif font-bold">
              No gems found for this vibe.
            </p>
            <p className="text-stone-500 text-sm mt-2">
              Try rephrasing — be more specific about lighting, noise, or
              coffee type.
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

"use client";

import { PlaceCard } from "@/components/PlaceCard";
import type { SearchResult } from "@/types";

// ── Skeleton card shown during loading ─────────────────────────────────────

function SkeletonCard({ delay }: { delay: number }) {
  return (
    <div
      className="rounded-2xl border border-stone-200 bg-white overflow-hidden animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* photo area */}
      <div className="h-40 sm:h-44 bg-cream relative overflow-hidden border-b border-stone-200">
        <div className="absolute inset-0 animate-shimmer" />
      </div>
      {/* body */}
      <div className="p-5 space-y-3.5">
        <div className="h-6 bg-stone-100 rounded-lg w-3/4" />
        <div className="space-y-1.5">
          <div className="h-3.5 bg-stone-100 rounded w-full" />
          <div className="h-3.5 bg-stone-100 rounded w-5/6" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <div className="h-5 w-16 bg-stone-100 rounded-full" />
          <div className="h-5 w-20 bg-stone-100 rounded-full" />
          <div className="h-5 w-14 bg-stone-100 rounded-full" />
        </div>
        <div className="space-y-1.5">
          <div className="h-3 bg-stone-100 rounded w-full" />
          <div className="h-3 bg-stone-100 rounded w-11/12" />
          <div className="h-3 bg-stone-100 rounded w-4/5" />
        </div>
      </div>
    </div>
  );
}

// ── Divider label ───────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <div className="h-px flex-1 bg-stone-200" />
      <span className="text-[11px] uppercase tracking-[0.25em] text-stone-500 font-sans font-bold whitespace-nowrap">
        {label}
      </span>
      <div className="h-px flex-1 bg-stone-200" />
    </div>
  );
}

// ── Results grid ────────────────────────────────────────────────────────────

interface ResultsGridProps {
  results: SearchResult[];
  query: string;
}

export function ResultsGrid({ results, query }: ResultsGridProps) {
  return (
    <section className="w-full animate-fade-in">
      <SectionLabel
        label={`${results.length} gem${results.length !== 1 ? "s" : ""} for "${query}"`}
      />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((place, i) => (
          <PlaceCard key={place.id} place={place} index={i} />
        ))}
      </div>
    </section>
  );
}

// ── Loading state ───────────────────────────────────────────────────────────

export function LoadingGrid() {
  return (
    <section className="w-full">
      <SectionLabel label="finding your gems..." />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} delay={i * 60} />
        ))}
      </div>
    </section>
  );
}

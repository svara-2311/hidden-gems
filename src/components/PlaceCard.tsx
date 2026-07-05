"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { MapPin, ArrowUpRight, Gem, Share2, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PLACE_ILLUSTRATIONS } from "@/components/illustrations";
import { cn } from "@/lib/cn";
import { isGemSaved, toggleSavedGem } from "@/lib/savedGems";
import type { SearchResult } from "@/types";

interface PlaceCardProps {
  place: SearchResult;
  index: number;
}

export function PlaceCard({ place, index }: PlaceCardProps) {
  const Illustration = PLACE_ILLUSTRATIONS[index % PLACE_ILLUSTRATIONS.length];
  const [isSaved, setIsSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setIsSaved(isGemSaved(place.id));
  }, [place.id]);

  const handleToggleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaved(
      toggleSavedGem({
        id: place.id,
        name: place.name,
        neighborhood: place.neighborhood,
        vibe_tags: place.vibe_tags,
        match_blurb: place.match_blurb,
      })
    );
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `Found a hidden gem! ☕ ${place.name} — ${place.neighborhood} 📍 ${place.google_maps_url} #HiddenGems`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — fail silently.
    }
  };

  const openInMaps = () =>
    window.open(place.google_maps_url, "_blank", "noopener,noreferrer");

  // Surface matched preferences first so the highlighted ones stay visible
  // within the truncated tag row.
  const matchedVibes = new Set(place.matched_vibes ?? []);
  const matchedDrinks = place.matched_drinks ?? [];
  const vibeTags = [...place.vibe_tags].sort(
    (a, b) => Number(matchedVibes.has(b)) - Number(matchedVibes.has(a))
  );

  return (
    <article
      onClick={openInMaps}
      role="link"
      tabIndex={0}
      aria-label={`Open ${place.name} in Google Maps`}
      onKeyDown={(e) => {
        if (e.key === "Enter") openInMaps();
      }}
      className={cn(
        "group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl",
        "border border-stone-200 bg-white",
        "hover:border-stone-900 hover:-translate-y-1",
        "hover:shadow-[6px_6px_0_0_rgba(28,25,23,1)]",
        "focus:outline-none focus-visible:border-stone-900 focus-visible:shadow-[6px_6px_0_0_rgba(28,25,23,1)]",
        "transition-all duration-300 ease-out",
        "animate-fade-up"
      )}
      style={{
        animationDelay: `${index * 90}ms`,
      }}
    >
      {/* Photo / illustration header */}
      <div className="relative h-40 sm:h-44 overflow-hidden bg-cream border-b border-stone-200">
        {place.photo_url ? (
          <Image
            src={place.photo_url}
            alt={place.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-stone-900">
            <Illustration className="h-16 w-16 sm:h-20 sm:w-20 opacity-80 transition-transform duration-500 group-hover:scale-110" />
          </div>
        )}

        {/* Neighborhood pill */}
        <div className="absolute bottom-3 left-3.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-900 bg-white px-2.5 py-1 text-xs font-medium text-stone-900">
            <MapPin className="h-3 w-3 shrink-0" />
            {place.neighborhood}
          </span>
        </div>

        {/* Similarity score */}
        <div className="absolute top-3 right-3.5">
          <span className="text-[10px] font-mono font-medium text-stone-500 bg-white/80 px-1.5 py-0.5 rounded border border-stone-200">
            {Math.round(place.similarity * 100)}% match
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3.5 p-5">
        {/* Name */}
        <h3 className="font-serif text-xl leading-snug text-stone-950 font-bold">
          {place.name}
        </h3>

        {/* AI match blurb */}
        <p className="text-sm italic leading-relaxed text-stone-700 border-l-2 border-rust pl-3 line-clamp-3">
          {place.match_blurb}
        </p>

        {/* Vibe tags (matched ones highlighted) + matched drinks */}
        {(vibeTags.length > 0 || matchedDrinks.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {vibeTags.slice(0, 5).map((tag) => (
              <Badge key={tag} highlight={matchedVibes.has(tag)}>
                #{tag}
              </Badge>
            ))}
            {matchedDrinks.map((drink) => (
              <Badge key={`drink-${drink}`} highlight>
                ☕ {drink}
              </Badge>
            ))}
          </div>
        )}

        {/* Known for */}
        {place.famous_for && (
          <p className="flex items-start gap-1.5 text-xs text-stone-600">
            <Star className="h-3.5 w-3.5 shrink-0 text-rust mt-0.5" fill="currentColor" />
            <span>
              <span className="font-semibold text-stone-800">Known for</span>{" "}
              {place.famous_for}
            </span>
          </p>
        )}


        {/* Footer */}
        <div className="mt-auto pt-3 border-t border-stone-200 flex items-center justify-between gap-2">
          <a
            href={place.google_maps_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-stone-900 hover:text-rust transition-colors duration-150"
          >
            Open in Maps
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>

          {/* Save & share actions */}
          <div className="relative flex items-center gap-1.5">
            {copied && (
              <span className="absolute -top-9 right-0 whitespace-nowrap rounded-full border border-stone-300 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-stone-700 animate-fade-in">
                Copied!
              </span>
            )}

            <button
              type="button"
              onClick={handleToggleSave}
              aria-pressed={isSaved}
              aria-label={isSaved ? "Remove from my gems" : "Add to my gems"}
              title={isSaved ? "Remove from my gems" : "Add to my gems"}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full border transition-colors duration-150",
                isSaved
                  ? "border-rust/40 bg-rust/10 text-rust"
                  : "border-stone-300 bg-white text-stone-400 hover:border-stone-900 hover:text-stone-900"
              )}
            >
              <Gem className="h-3.5 w-3.5" fill={isSaved ? "currentColor" : "none"} />
            </button>

            <button
              type="button"
              onClick={handleShare}
              aria-label="Copy a shareable summary of this gem"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-stone-300 bg-white text-stone-400 hover:border-stone-900 hover:text-stone-900 transition-colors duration-150"
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

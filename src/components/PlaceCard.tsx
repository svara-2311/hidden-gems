"use client";

import Image from "next/image";
import { MapPin, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import type { SearchResult } from "@/types";

// Rotating gradient palettes for photo placeholders
const GRADIENTS = [
  "from-amber-950 via-orange-950 to-stone-950",
  "from-teal-950 via-cyan-950 to-stone-950",
  "from-indigo-950 via-violet-950 to-stone-950",
  "from-rose-950 via-pink-950 to-stone-950",
  "from-emerald-950 via-green-950 to-stone-950",
  "from-sky-950 via-blue-950 to-stone-950",
];

// Subtle grain texture as SVG data URI
const GRAIN_BG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`;

interface PlaceCardProps {
  place: SearchResult;
  index: number;
}

export function PlaceCard({ place, index }: PlaceCardProps) {
  const gradient = GRADIENTS[index % GRADIENTS.length];

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl",
        "border border-stone-800/60 bg-stone-900/60 backdrop-blur-sm",
        "hover:border-stone-700/80 hover:-translate-y-1.5",
        "hover:shadow-2xl hover:shadow-black/50",
        "transition-all duration-300 ease-out",
        "animate-fade-up"
      )}
      style={{
        animationDelay: `${index * 90}ms`,
      }}
    >
      {/* Photo / placeholder header */}
      <div className="relative h-44 overflow-hidden">
        {place.photo_url ? (
          <Image
            src={place.photo_url}
            alt={place.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div
            className={cn(
              "h-full w-full bg-gradient-to-br",
              gradient
            )}
            style={{ backgroundImage: `${GRAIN_BG}` }}
          />
        )}
        {/* Gradient scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/20 to-transparent" />

        {/* Neighborhood pill */}
        <div className="absolute bottom-3 left-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-xs text-stone-300 backdrop-blur-md border border-white/5">
            <MapPin className="h-3 w-3 text-amber-400 shrink-0" />
            {place.neighborhood}
          </span>
        </div>

        {/* Similarity score — subtle top-right indicator */}
        <div className="absolute top-3 right-3">
          <span className="text-[10px] font-mono text-stone-600 bg-black/40 px-1.5 py-0.5 rounded backdrop-blur-sm">
            {Math.round(place.similarity * 100)}% match
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3.5 p-5">
        {/* Name */}
        <h3 className="font-serif text-xl leading-snug text-stone-100 group-hover:text-amber-100 transition-colors duration-200">
          {place.name}
        </h3>

        {/* AI match blurb */}
        <p className="text-sm italic leading-relaxed text-amber-300/75 border-l-2 border-amber-700/40 pl-3">
          {place.match_blurb}
        </p>

        {/* Vibe tags */}
        {place.vibe_tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {place.vibe_tags.slice(0, 5).map((tag) => (
              <Badge key={tag}>#{tag}</Badge>
            ))}
          </div>
        )}

        {/* Editorial summary */}
        <p className="text-sm text-stone-500 leading-relaxed line-clamp-3">
          {place.editorial_summary}
        </p>

        {/* Footer */}
        <div className="mt-auto pt-3 border-t border-stone-800/50">
          <a
            href={place.google_maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-amber-400 transition-colors duration-150"
          >
            Open in Maps
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </article>
  );
}

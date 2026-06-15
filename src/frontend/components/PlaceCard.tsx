"use client";

import Image from "next/image";
import { MapPin, ArrowUpRight } from "lucide-react";
import { Badge } from "@/frontend/components/ui/badge";
import { PLACE_ILLUSTRATIONS } from "@/frontend/components/illustrations";
import { cn } from "@/frontend/lib/cn";
import type { SearchResult } from "@/shared/types";

interface PlaceCardProps {
  place: SearchResult;
  index: number;
}

export function PlaceCard({ place, index }: PlaceCardProps) {
  const Illustration = PLACE_ILLUSTRATIONS[index % PLACE_ILLUSTRATIONS.length];

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl",
        "border border-stone-200 bg-white",
        "hover:border-stone-900 hover:-translate-y-1",
        "hover:shadow-[6px_6px_0_0_rgba(28,25,23,1)]",
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
        <p className="text-sm italic leading-relaxed text-stone-700 border-l-2 border-rust pl-3">
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
        <div className="mt-auto pt-3 border-t border-stone-200">
          <a
            href={place.google_maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-stone-900 hover:text-rust transition-colors duration-150"
          >
            Open in Maps
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </article>
  );
}

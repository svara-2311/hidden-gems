"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";
import { MapComponent } from "@/components/MapComponent";
import { CoffeeCupIllustration } from "@/components/illustrations";
import { cn } from "@/lib/cn";
import type { SearchResult } from "@/types";

export default function MapPage() {
  const [allPlaces, setAllPlaces] = useState<SearchResult[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);
  const [neighborhood, setNeighborhood] = useState("");

  useEffect(() => {
    const loadPlaces = async () => {
      try {
        const res = await fetch("/api/places");
        const data = await res.json();
        setAllPlaces(data.places || []);
      } catch (error) {
        console.error("Failed to load places:", error);
      }
    };
    loadPlaces();
  }, []);

  const displayPlaces = neighborhood.trim()
    ? allPlaces.filter((p) =>
        p.neighborhood.toLowerCase().includes(neighborhood.trim().toLowerCase())
      )
    : allPlaces;

  return (
    <div className="min-h-screen bg-cream font-sans">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-cream/95 backdrop-blur-sm px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-stone-500 hover:text-stone-950 transition-colors duration-150"
            >
              <ArrowLeft className="h-3 w-3" />
              Search
            </Link>
            <span className="text-stone-300 select-none">·</span>
            <div className="inline-flex items-center gap-2">
              <CoffeeCupIllustration className="h-4 w-4 text-stone-950" />
              <span className="text-[11px] uppercase tracking-[0.35em] text-stone-950 font-bold">
                hidden gems
              </span>
            </div>
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wide text-stone-400">
            {displayPlaces.length} {displayPlaces.length === 1 ? "place" : "places"}
          </span>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex h-[calc(100vh-49px)]">
        {/* Map */}
        <div className="flex-1 min-w-0 p-3">
          <MapComponent places={displayPlaces} selectedPlace={selectedPlace} />
        </div>

        {/* Sidebar */}
        <div className="w-80 shrink-0 flex flex-col border-l border-stone-200 bg-white overflow-hidden">
          {/* Neighborhood filter */}
          <div className="p-4 border-b border-stone-200">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">
              Neighborhood
            </label>
            <input
              type="text"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              placeholder="e.g., Mission, SoMa…"
              className={cn(
                "w-full mt-1.5 rounded-xl border-2 border-stone-200 bg-white",
                "px-3 py-2 text-sm text-stone-950 placeholder:text-stone-400",
                "focus:outline-none focus:border-stone-950",
                "transition-colors duration-150"
              )}
            />
          </div>

          {/* Place list */}
          <div className="flex-1 overflow-y-auto divide-y divide-stone-100">
            {displayPlaces.length === 0 ? (
              <p className="text-sm text-stone-400 text-center p-8">
                {allPlaces.length === 0 ? "No places loaded." : "No matches for that neighborhood."}
              </p>
            ) : (
              displayPlaces.map((place) => (
                <button
                  key={place.id}
                  onClick={() => setSelectedPlace(place.id)}
                  className={cn(
                    "w-full text-left px-4 py-3 transition-colors duration-100 border-l-2",
                    selectedPlace === place.id
                      ? "bg-cream border-rust"
                      : "bg-white border-transparent hover:bg-stone-50"
                  )}
                >
                  <p className="text-sm font-bold text-stone-950 font-serif leading-snug">
                    {place.name}
                  </p>
                  <p className="text-xs text-stone-500 mt-0.5 flex items-center gap-1">
                    <MapPin className="h-2.5 w-2.5 shrink-0" />
                    {place.neighborhood}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

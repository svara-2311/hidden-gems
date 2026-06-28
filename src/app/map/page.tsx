"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MapComponent } from "@/components/MapComponent";
import type { SearchResult } from "@/shared/types";

export default function MapPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [allPlaces, setAllPlaces] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);
  const [neighborhood, setNeighborhood] = useState("");
  const [view, setView] = useState<"search" | "all">("search");

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

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSelectedPlace(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, neighborhood: neighborhood || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setResults(data.results);
        setView("search");
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const displayPlaces = view === "search" ? results : allPlaces;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <div className="border-b border-stone-800 bg-stone-900 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-amber-500">☕ Hidden Gems Maps</h1>
            <Link href="/" className="text-xs text-stone-400 hover:text-stone-300 underline">
              ← Back
            </Link>
          </div>
          <div className="text-sm text-stone-400">{displayPlaces.length} places</div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)] gap-4 p-4 max-w-7xl mx-auto">
        <div className="flex-1 min-w-0">
          <MapComponent places={displayPlaces} selectedPlace={selectedPlace} />
        </div>

        <div className="w-96 flex flex-col gap-4 overflow-y-auto">
          <div className="bg-stone-900 border border-stone-800 rounded-lg p-4 space-y-3">
            <div>
              <label className="text-xs font-semibold text-stone-400 uppercase">Search Query</label>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.ctrlKey) handleSearch();
                }}
                placeholder="e.g., quiet spot to read..."
                className="w-full mt-2 bg-stone-800 border border-stone-700 rounded px-3 py-2 text-sm text-stone-100 resize-none"
                rows={3}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-400 uppercase">Neighborhood (optional)</label>
              <input
                type="text"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="e.g., Mission, SoMa..."
                className="w-full mt-2 bg-stone-800 border border-stone-700 rounded px-3 py-2 text-sm text-stone-100"
              />
            </div>

            <button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-stone-700 text-white font-semibold py-2 px-4 rounded text-sm"
            >
              {loading ? "Searching..." : "Search"}
            </button>

            <button
              onClick={() => {
                setView("all");
                setResults([]);
                setQuery("");
              }}
              className="w-full bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold py-2 px-4 rounded text-sm"
            >
              Show All Places
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
            {displayPlaces.map((place) => (
              <div
                key={place.id}
                onClick={() => setSelectedPlace(place.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedPlace === place.id
                    ? "bg-amber-600/20 border-amber-500"
                    : "bg-stone-900 border-stone-800"
                }`}
              >
                <h3 className="font-semibold text-sm text-stone-100">{place.name}</h3>
                <p className="text-xs text-stone-400 mt-1">{place.neighborhood}</p>
                {place.match_blurb && <p className="text-xs text-stone-300 italic mt-2">"{place.match_blurb}"</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

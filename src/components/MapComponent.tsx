"use client";

import { useMemo } from "react";
import type { SearchResult } from "@/shared/types";

interface MapComponentProps {
  places: SearchResult[];
  selectedPlace?: string | null;
}

export function MapComponent({ places, selectedPlace }: MapComponentProps) {
  const bounds = useMemo(() => {
    const validPlaces = places.filter((p) => p.latitude && p.longitude);
    if (validPlaces.length === 0) {
      return { minLat: 37.2, maxLat: 37.8, minLon: -122.6, maxLon: -121.8 };
    }

    const lats = validPlaces.map((p) => p.latitude!);
    const lons = validPlaces.map((p) => p.longitude!);
    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLon: Math.min(...lons),
      maxLon: Math.max(...lons),
    };
  }, [places]);

  const osmUrl = useMemo(() => {
    const padding = 0.05;
    const latPadding = (bounds.maxLat - bounds.minLat) * padding;
    const lonPadding = (bounds.maxLon - bounds.minLon) * padding;

    const bbox = [
      bounds.minLon - lonPadding,
      bounds.minLat - latPadding,
      bounds.maxLon + lonPadding,
      bounds.maxLat + latPadding,
    ].join(",");

    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${bounds.minLat},${bounds.minLon}`;
  }, [bounds]);

  const validPlaces = places.filter((p) => p.latitude && p.longitude);

  return (
    <div className="relative w-full h-full rounded-xl border border-stone-200 overflow-hidden bg-cream flex flex-col">
      <iframe
        width="100%"
        height="100%"
        frameBorder="0"
        src={osmUrl}
        style={{ minHeight: "500px", border: "none" }}
        className="flex-1"
      />

      <div className="absolute top-4 left-4 bg-white/90 border border-stone-200 rounded-lg p-3 max-w-xs max-h-32 overflow-y-auto text-xs space-y-1 pointer-events-none shadow-sm">
        <p className="font-bold text-stone-950">{validPlaces.length} on map</p>
        <div className="space-y-0.5 text-stone-600">
          {validPlaces.slice(0, 5).map((place) => (
            <div
              key={place.id}
              className={`truncate ${selectedPlace === place.id ? "text-rust font-semibold" : ""}`}
            >
              • {place.name}
            </div>
          ))}
          {validPlaces.length > 5 && (
            <div className="text-stone-400">+{validPlaces.length - 5} more</div>
          )}
        </div>
      </div>

      <div className="absolute bottom-0 right-0 bg-cream/90 text-stone-400 text-[10px] px-2 py-1">
        © OpenStreetMap contributors
      </div>
    </div>
  );
}

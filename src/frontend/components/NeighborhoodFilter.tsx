"use client";

import { MapPin, X } from "lucide-react";

interface NeighborhoodFilterProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function NeighborhoodFilter({ value, onChange, disabled }: NeighborhoodFilterProps) {
  return (
    <div className="w-full max-w-xs mx-auto">
      <div className="flex items-center gap-2 rounded-full border border-stone-300 bg-white/60 px-3.5 py-1.5 transition-colors focus-within:border-stone-900">
        <MapPin className="h-3.5 w-3.5 text-stone-400 shrink-0" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Optional: filter by neighborhood (e.g. Mission, SoMa)"
          className="w-full bg-transparent text-xs text-stone-700 placeholder:text-stone-400 focus:outline-none disabled:opacity-60"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Clear neighborhood filter"
            className="text-stone-400 hover:text-stone-900 transition-colors shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

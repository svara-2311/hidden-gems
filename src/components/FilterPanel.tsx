"use client";

import { useState } from "react";
import { SlidersHorizontal, Search, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  AREA_GROUPS,
  VIBE_TAGS,
  VIBE_LABELS,
  DRINK_TYPES,
  DRINK_LABELS,
} from "@/taxonomy";

export interface Filters {
  areas: string[];
  vibes: string[];
  drinks: string[];
}

interface FilterPanelProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  onSearch: () => void;
  isLoading: boolean;
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

// A single selectable pill.
function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150",
        active
          ? "border-stone-950 bg-stone-950 text-cream"
          : "border-stone-300 bg-white text-stone-600 hover:border-stone-950 hover:text-stone-950"
      )}
    >
      {label}
    </button>
  );
}

export function FilterPanel({ filters, onChange, onSearch, isLoading }: FilterPanelProps) {
  const [open, setOpen] = useState(false);
  const activeCount = filters.areas.length + filters.vibes.length + filters.drinks.length;

  const clearAll = () =>
    onChange({ areas: [], vibes: [], drinks: [] });

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Toggle row */}
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors duration-150",
            open || activeCount > 0
              ? "border-stone-950 bg-stone-950 text-cream"
              : "border-stone-300 bg-white text-stone-600 hover:border-stone-950 hover:text-stone-950"
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {activeCount > 0 && (
            <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rust px-1 text-[10px] text-white">
              {activeCount}
            </span>
          )}
        </button>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-stone-950 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Expandable panel */}
      {open && (
        <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-5 space-y-5 animate-fade-in">
          {/* Area */}
          <section>
            <h4 className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-stone-500">
              Area
            </h4>
            <div className="space-y-3">
              {AREA_GROUPS.map((group) => (
                <div key={group.region}>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                    {group.region}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.areas.map((area) => (
                      <Chip
                        key={area.label}
                        label={area.label}
                        active={filters.areas.includes(area.label)}
                        onClick={() =>
                          onChange({ ...filters, areas: toggle(filters.areas, area.label) })
                        }
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Vibe */}
          <section>
            <h4 className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-stone-500">
              Vibe
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {VIBE_TAGS.map((tag) => (
                <Chip
                  key={tag}
                  label={VIBE_LABELS[tag]}
                  active={filters.vibes.includes(tag)}
                  onClick={() => onChange({ ...filters, vibes: toggle(filters.vibes, tag) })}
                />
              ))}
            </div>
          </section>

          {/* Drinks */}
          <section>
            <h4 className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-stone-500">
              Drinks
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {DRINK_TYPES.map((drink) => (
                <Chip
                  key={drink}
                  label={DRINK_LABELS[drink]}
                  active={filters.drinks.includes(drink)}
                  onClick={() => onChange({ ...filters, drinks: toggle(filters.drinks, drink) })}
                />
              ))}
            </div>
          </section>

          {/* Search action */}
          <button
            type="button"
            onClick={onSearch}
            disabled={isLoading}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-xl bg-stone-950 px-4 py-2.5",
              "text-sm font-bold uppercase tracking-wide text-cream",
              "transition-all duration-150 hover:bg-stone-800 active:scale-[0.99]",
              "disabled:opacity-60"
            )}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Search
          </button>
        </div>
      )}
    </div>
  );
}

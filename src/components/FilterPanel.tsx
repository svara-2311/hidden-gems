"use client";

import { useState } from "react";
import { Compass, Wand2, Coffee, Search, X, Loader2 } from "lucide-react";
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

type Category = "area" | "vibe" | "drinks";

interface FilterPanelProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  onSearch: () => void;
  isLoading: boolean;
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

// A single selectable option pill.
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

const TABS: {
  id: Category;
  label: string;
  icon: typeof Compass;
  iconColor: string;
  iconBg: string;
}[] = [
  { id: "area", label: "Area", icon: Compass, iconColor: "text-espresso/70", iconBg: "bg-latte" },
  { id: "vibe", label: "Vibe", icon: Wand2, iconColor: "text-espresso/70", iconBg: "bg-latte" },
  { id: "drinks", label: "Drinks", icon: Coffee, iconColor: "text-espresso/70", iconBg: "bg-latte" },
];

export function FilterPanel({ filters, onChange, onSearch, isLoading }: FilterPanelProps) {
  const [open, setOpen] = useState<Category | null>(null);

  const counts: Record<Category, number> = {
    area: filters.areas.length,
    vibe: filters.vibes.length,
    drinks: filters.drinks.length,
  };
  const total = counts.area + counts.vibe + counts.drinks;

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Category buttons — big, tappable sticker cards. Tap one to reveal its options below. */}
      <div className="flex items-start justify-center gap-3 sm:gap-4">
        {TABS.map(({ id, label, icon: Icon, iconColor, iconBg }) => (
          <button
            key={id}
            type="button"
            onClick={() => setOpen((o) => (o === id ? null : id))}
            aria-expanded={open === id}
            className={cn(
              "group relative flex flex-col items-center gap-2 rounded-[1.75rem] border-2 px-5 py-4 sm:px-6 transition-all duration-200",
              open === id
                ? "border-stone-950 bg-stone-950 -translate-y-1 shadow-[4px_4px_0_0_rgba(28,25,23,1)]"
                : "border-stone-200 bg-white hover:-translate-y-1 hover:border-stone-950 hover:shadow-[4px_4px_0_0_rgba(28,25,23,1)]"
            )}
          >
            {counts[id] > 0 && (
              <span className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rust px-1 text-[10px] font-bold text-white ring-2 ring-cream">
                {counts[id]}
              </span>
            )}
            <span
              className={cn(
                "flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full transition-transform duration-300 ease-out",
                "group-hover:-rotate-6 group-hover:scale-110 group-active:scale-95",
                iconBg,
                iconColor
              )}
            >
              <Icon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.25} />
            </span>
            <span
              className={cn(
                "text-[11px] font-bold uppercase tracking-wide transition-colors duration-150",
                open === id ? "text-cream" : "text-stone-600 group-hover:text-stone-950"
              )}
            >
              {label}
            </span>
          </button>
        ))}
      </div>

      {total > 0 && (
        <div className="mt-2.5 flex justify-center">
          <button
            type="button"
            onClick={() => onChange({ areas: [], vibes: [], drinks: [] })}
            className="inline-flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-stone-950 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        </div>
      )}

      {/* Options for the open category only (one at a time) */}
      {open && (
        <div className="mt-3 rounded-2xl border border-stone-200 bg-white p-4 animate-fade-in">
          {open === "area" && (
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
          )}

          {open === "vibe" && (
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
          )}

          {open === "drinks" && (
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
          )}
        </div>
      )}

      {/* Search appears once there's something to search for */}
      {total > 0 && (
        <button
          type="button"
          onClick={onSearch}
          disabled={isLoading}
          className={cn(
            "mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-stone-950 px-4 py-2.5",
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
      )}
    </div>
  );
}

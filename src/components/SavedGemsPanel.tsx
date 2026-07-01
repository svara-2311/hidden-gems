"use client";

import { useEffect, useState } from "react";
import { X, Bookmark, MapPin, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import {
  getSavedGems,
  toggleSavedGem,
  SAVED_GEMS_EVENT,
  type SavedGem,
} from "@/lib/savedGems";

interface SavedGemsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function SavedGemsPanel({ open, onClose }: SavedGemsPanelProps) {
  const [gems, setGems] = useState<SavedGem[]>([]);

  useEffect(() => {
    const sync = () => setGems(getSavedGems());
    sync();
    window.addEventListener(SAVED_GEMS_EVENT, sync);
    return () => window.removeEventListener(SAVED_GEMS_EVENT, sync);
  }, []);

  const handleRemove = (gem: SavedGem) => {
    toggleSavedGem(gem);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-stone-950/30 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-80 bg-white border-l border-stone-200 shadow-xl",
          "flex flex-col transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
          <div className="flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-rust" fill="currentColor" />
            <span className="text-sm font-bold uppercase tracking-wide text-stone-950">
              Saved Gems
            </span>
            {gems.length > 0 && (
              <span className="text-[10px] font-bold bg-rust/10 text-rust border border-rust/30 rounded-full px-2 py-0.5">
                {gems.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close saved gems"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-stone-200 text-stone-400 hover:border-stone-900 hover:text-stone-900 transition-colors duration-150"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {gems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
              <Bookmark className="h-8 w-8 text-stone-300" />
              <p className="text-sm font-serif font-bold text-stone-950">No saved gems yet</p>
              <p className="text-xs text-stone-400 leading-relaxed">
                Tap the bookmark on any result to save it here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-stone-100">
              {gems.map((gem) => (
                <li
                  key={gem.id}
                  className="px-5 py-4 hover:bg-stone-50 transition-colors duration-100"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-serif font-bold text-stone-950 truncate">
                        {gem.name}
                      </p>
                      <p className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-2.5 w-2.5 shrink-0" />
                        {gem.neighborhood}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemove(gem)}
                      aria-label={`Remove ${gem.name} from saved`}
                      className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full border border-stone-200 text-stone-300 hover:border-red-300 hover:text-red-400 transition-colors duration-150"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {gem.match_blurb && (
                    <p className="mt-2 text-xs italic text-stone-500 leading-relaxed border-l-2 border-rust pl-2.5 line-clamp-2">
                      {gem.match_blurb}
                    </p>
                  )}

                  {gem.vibe_tags && gem.vibe_tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {gem.vibe_tags.slice(0, 4).map((tag) => (
                        <Badge key={tag}>#{tag}</Badge>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer — clear all */}
        {gems.length > 0 && (
          <div className="px-5 py-4 border-t border-stone-200">
            <button
              onClick={() => gems.forEach((g) => toggleSavedGem(g))}
              className="w-full text-xs font-bold uppercase tracking-wide text-stone-400 hover:text-red-400 transition-colors duration-150"
            >
              Clear all
            </button>
          </div>
        )}
      </div>
    </>
  );
}

"use client";

import { useState, useRef, useCallback } from "react";
import { Search, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/frontend/lib/cn";

const EXAMPLE_VIBES = [
  "quiet corner, good espresso, no music",
  "moody and dimly lit to read on a rainy morning",
  "sunny patio with pour-over and reliable wifi",
  "third-wave but not pretentious, meeting a client",
];

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

export function SearchBar({ onSearch, isLoading }: SearchBarProps) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    if (!value.trim() || isLoading) return;
    onSearch(value.trim());
  }, [value, isLoading, onSearch]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Main input */}
      <div
        className={cn(
          "relative rounded-2xl border transition-all duration-300",
          "bg-stone-900/80 backdrop-blur-sm",
          focused || value
            ? "border-amber-600/60 shadow-xl shadow-amber-950/30 ring-1 ring-amber-600/20"
            : "border-stone-700/40 shadow-lg shadow-black/20",
          isLoading && "opacity-70 pointer-events-none"
        )}
      >
        <Search
          className={cn(
            "absolute left-4 top-4 h-5 w-5 transition-colors duration-200",
            focused || value ? "text-amber-500" : "text-stone-600"
          )}
        />
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="describe your vibe..."
          rows={2}
          disabled={isLoading}
          className={cn(
            "w-full resize-none bg-transparent",
            "pl-12 pr-14 pt-4 pb-4",
            "text-stone-100 placeholder:text-stone-600",
            "focus:outline-none text-base leading-relaxed font-sans"
          )}
        />
        <button
          onClick={handleSubmit}
          disabled={!value.trim() || isLoading}
          aria-label="Search"
          className={cn(
            "absolute right-3 top-3 flex h-10 w-10 items-center justify-center",
            "rounded-xl transition-all duration-200",
            value.trim() && !isLoading
              ? "bg-amber-600 text-white hover:bg-amber-500 shadow-lg shadow-amber-900/40 active:scale-90"
              : "bg-stone-800 text-stone-600"
          )}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Example prompts */}
      <div className="flex flex-wrap gap-2 justify-center">
        {EXAMPLE_VIBES.map((vibe, i) => (
          <button
            key={i}
            onClick={() => {
              setValue(vibe);
              textareaRef.current?.focus();
            }}
            className={cn(
              "rounded-full border border-stone-800 bg-stone-900/40 px-3 py-1",
              "text-xs text-stone-600 hover:border-stone-700 hover:text-stone-400",
              "transition-all duration-150 hover:bg-stone-800/60"
            )}
          >
            {vibe}
          </button>
        ))}
      </div>
    </div>
  );
}

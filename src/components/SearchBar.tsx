"use client";

import { useRef, useCallback, useState } from "react";
import { Search, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

const EXAMPLE_VIBES = [
  "quiet corner, good espresso, no music",
  "moody and dimly lit to read on a rainy morning",
  "sunny patio with pour-over and reliable wifi",
  "third-wave but not pretentious, meeting a client",
];

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  isLoading: boolean;
}

export function SearchBar({ value, onChange, onSearch, isLoading }: SearchBarProps) {
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    if (isLoading) return;
    onSearch();
  }, [isLoading, onSearch]);

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
          "relative rounded-2xl border-2 bg-white transition-all duration-300",
          focused || value
            ? "border-stone-950 shadow-[4px_4px_0_0_rgba(28,25,23,1)]"
            : "border-stone-300",
          isLoading && "opacity-70 pointer-events-none"
        )}
      >
        <Search
          className={cn(
            "absolute left-4 top-4 h-5 w-5 transition-colors duration-200",
            focused || value ? "text-stone-950" : "text-stone-400"
          )}
        />
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="describe your vibe..."
          rows={2}
          disabled={isLoading}
          className={cn(
            "w-full resize-none bg-transparent",
            "pl-12 pr-14 pt-4 pb-4",
            "text-stone-950 placeholder:text-stone-400",
            "focus:outline-none text-base leading-relaxed font-sans"
          )}
        />
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          aria-label="Search"
          className={cn(
            "absolute right-3 top-3 flex h-10 w-10 items-center justify-center",
            "rounded-xl transition-all duration-200",
            value.trim() && !isLoading
              ? "bg-stone-950 text-cream hover:bg-stone-800 active:scale-90"
              : "bg-stone-100 text-stone-400"
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
              onChange(vibe);
              textareaRef.current?.focus();
            }}
            className={cn(
              "rounded-full border border-stone-300 bg-white px-3 py-1",
              "text-xs text-stone-600 hover:border-stone-950 hover:text-stone-950",
              "transition-all duration-150"
            )}
          >
            {vibe}
          </button>
        ))}
      </div>
    </div>
  );
}

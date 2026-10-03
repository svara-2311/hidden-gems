"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import { Search, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  isLoading: boolean;
}

// Typed out, letter by letter, as a placeholder when the input is empty and
// unfocused — shows people the kind of moods they can describe instead of a
// flat "type here."
const EXAMPLE_VIBES = [
  "quiet corner with good espresso to read on a rainy morning...",
  "bright and lively, great for catching up with an old friend...",
  "a laptop-friendly spot with fast wifi and strong cold brew...",
  "cozy, dim lighting, perfect for a first date...",
  "outdoor seating in the sun with an oat milk latte...",
  "minimalist and quiet enough to get real work done...",
];

const TYPING_SPEED_MS = 35;
const DELETING_SPEED_MS = 20;
const PAUSE_MS = 1400;

export function SearchBar({ value, onChange, onSearch, isLoading }: SearchBarProps) {
  const [focused, setFocused] = useState(false);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [phase, setPhase] = useState<"typing" | "deleting">("typing");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // A tiny typewriter: type a phrase out, pause, delete it, move to the next —
  // but only while the field is empty and not being used.
  useEffect(() => {
    if (focused || value) return;
    const phraseLength = EXAMPLE_VIBES[phraseIndex].length;

    if (phase === "typing" && charCount === phraseLength) {
      const id = setTimeout(() => setPhase("deleting"), PAUSE_MS);
      return () => clearTimeout(id);
    }

    const id = setTimeout(
      () => {
        if (phase === "typing") {
          setCharCount((c) => c + 1);
        } else if (charCount > 0) {
          setCharCount((c) => c - 1);
        } else {
          setPhase("typing");
          setPhraseIndex((i) => (i + 1) % EXAMPLE_VIBES.length);
        }
      },
      phase === "typing" ? TYPING_SPEED_MS : DELETING_SPEED_MS
    );
    return () => clearTimeout(id);
  }, [focused, value, phase, charCount, phraseIndex]);

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
        {!focused && !value && (
          <span
            aria-hidden
            className="pointer-events-none absolute left-12 right-14 top-4 text-base leading-relaxed text-stone-400 font-sans"
          >
            {EXAMPLE_VIBES[phraseIndex].slice(0, charCount)}
            <span className="ml-0.5 inline-block w-[2px] h-[1em] align-middle bg-rust animate-pulse" />
          </span>
        )}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder=""
          aria-label="Describe your vibe"
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

    </div>
  );
}

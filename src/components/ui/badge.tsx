import * as React from "react";
import { cn } from "@/lib/cn";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  // Highlighted badges mark a preference the user picked that this place matches.
  highlight?: boolean;
}

// A small rounded pill, used for vibe tags and matched preferences on place cards.
export function Badge({ className, highlight, ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
        highlight
          ? "border-rust/40 bg-rust/10 text-rust"
          : "border-stone-300 bg-white text-stone-600 hover:border-stone-900 hover:text-stone-900",
        className
      )}
      {...props}
    />
  );
}

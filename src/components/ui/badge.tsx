import * as React from "react";
import { cn } from "@/lib/cn";

// A small rounded pill, used for vibe tags on place cards.
export function Badge({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
        "border-stone-300 bg-white text-stone-600 hover:border-stone-900 hover:text-stone-900",
        className
      )}
      {...props}
    />
  );
}

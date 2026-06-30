import type { SVGProps } from "react";

type IllustrationProps = SVGProps<SVGSVGElement>;

const shared = {
  viewBox: "0 0 100 100",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function CoffeeCupIllustration(props: IllustrationProps) {
  return (
    <svg {...shared} {...props}>
      <path d="M22 38h48l-4 30a8 8 0 0 1-8 7H34a8 8 0 0 1-8-7l-4-30Z" />
      <path d="M70 42h6a9 9 0 0 1 0 18h-7" />
      <path d="M32 26c-2 4 2 6 0 10M44 24c-2 4 2 6 0 10M56 26c-2 4 2 6 0 10" />
    </svg>
  );
}

export function PourOverIllustration(props: IllustrationProps) {
  return (
    <svg {...shared} {...props}>
      <path d="M32 28h36l-6 18H38L32 28Z" />
      <rect x="34" y="50" width="32" height="24" rx="3" />
      <path d="M66 56h6a6 6 0 0 1 0 12h-6" />
      <path d="M44 18c-2 4 2 6 0 10M56 18c-2 4 2 6 0 10" />
    </svg>
  );
}

export function PlantIllustration(props: IllustrationProps) {
  return (
    <svg {...shared} {...props}>
      <path d="M30 60h40l-5 28a4 4 0 0 1-4 4H39a4 4 0 0 1-4-4l-5-28Z" />
      <path d="M50 60V34" />
      <path d="M50 44c-10-2-16-12-14-22 10 2 16 12 14 22Z" />
      <path d="M50 50c10-2 16-12 14-22-10 2-16 12-14 22Z" />
    </svg>
  );
}

export function WindowIllustration(props: IllustrationProps) {
  return (
    <svg {...shared} {...props}>
      <rect x="18" y="18" width="64" height="64" rx="2" />
      <path d="M50 18v64M18 50h64" />
      <circle cx="68" cy="32" r="6" />
    </svg>
  );
}

export function CroissantIllustration(props: IllustrationProps) {
  return (
    <svg {...shared} {...props}>
      <path d="M20 55c5-25 30-35 50-25 8 4 12 12 8 18-10-8-30-10-45 2-8 6-10 14-6 22-10-2-18-8-21-17Z" />
      <path d="M30 50c8-4 18-4 26 2M28 58c8-3 18-2 25 4" />
    </svg>
  );
}

export function BeansIllustration(props: IllustrationProps) {
  return (
    <svg {...shared} {...props}>
      <ellipse cx="38" cy="45" rx="16" ry="22" transform="rotate(-20 38 45)" />
      <path d="M30 30c4 6 4 22 0 30" transform="rotate(-20 38 45)" />
      <ellipse cx="64" cy="58" rx="14" ry="19" transform="rotate(15 64 58)" />
      <path d="M58 44c4 6 4 20 0 28" transform="rotate(15 64 58)" />
    </svg>
  );
}

export const PLACE_ILLUSTRATIONS = [
  CoffeeCupIllustration,
  PlantIllustration,
  WindowIllustration,
  PourOverIllustration,
  CroissantIllustration,
  BeansIllustration,
];

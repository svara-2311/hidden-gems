/**
 * taxonomy.ts — single source of truth for the controlled vocabularies used by
 * both the seed enrichment (scripts/) and the frontend filters (src/app, src/frontend).
 *
 * The enrichment LLM is constrained to pick vibe/drink values ONLY from these
 * lists, so the structured columns stay clean enough for hard SQL filtering.
 */

// ── Vibe tags ───────────────────────────────────────────────────────────────
// Atmosphere / use-case descriptors. The LLM assigns 2–4 per place.

export const VIBE_TAGS = [
  "cozy",
  "quiet",
  "laptop-friendly",
  "lively",
  "spacious",
  "minimalist",
  "outdoor-seating",
  "date-spot",
  "grab-and-go",
  "classic",
  "trendy",
  "hidden-gem",
  "family-friendly",
  "pet-friendly",
  "drive-thru",
  "roastery",
  "historic",
  "scenic-view",
] as const;

export type VibeTag = (typeof VIBE_TAGS)[number];

// Human-friendly labels for the UI (kebab → Title Case happens here once).
export const VIBE_LABELS: Record<VibeTag, string> = {
  cozy: "Cozy",
  quiet: "Quiet",
  "laptop-friendly": "Laptop-friendly",
  lively: "Lively",
  spacious: "Spacious",
  minimalist: "Minimalist",
  "outdoor-seating": "Outdoor seating",
  "date-spot": "Date spot",
  "grab-and-go": "Grab & go",
  classic: "Classic",
  trendy: "Trendy",
  "hidden-gem": "Hidden gem",
  "family-friendly": "Family-friendly",
  "pet-friendly": "Pet-friendly",
  "drive-thru": "Drive-thru",
  roastery: "On-site roastery",
  historic: "Historic",
  "scenic-view": "Scenic view",
};

// ── Drink types (specialties) ────────────────────────────────────────────────
// What the place is good at, drink-wise. The LLM assigns 2–5 per place.

export const DRINK_TYPES = [
  "espresso",
  "pour-over",
  "cold-brew",
  "latte",
  "cappuccino",
  "matcha",
  "chai",
  "tea",
  "mocha",
  "nitro",
  "oat-milk",
  "pastries",
  "boba",
  "drip-coffee",
  "breakfast",
  "smoothie",
] as const;

export type DrinkType = (typeof DRINK_TYPES)[number];

export const DRINK_LABELS: Record<DrinkType, string> = {
  espresso: "Espresso",
  "pour-over": "Pour-over",
  "cold-brew": "Cold brew",
  latte: "Latte",
  cappuccino: "Cappuccino",
  matcha: "Matcha",
  chai: "Chai",
  tea: "Tea",
  mocha: "Mocha",
  nitro: "Nitro",
  "oat-milk": "Oat milk",
  pastries: "Pastries",
  boba: "Boba",
  "drip-coffee": "Drip coffee",
  breakfast: "Breakfast",
  smoothie: "Smoothie",
};

// ── Areas ─────────────────────────────────────────────────────────────────────
// Curated area buckets grouped by region. Each area carries ILIKE `patterns`
// that are matched against BOTH the `neighborhood` and `city` columns, which
// absorbs the messy raw data (e.g. "Mission" → "Mission" and "Mission District",
// "Castro" → "The Castro", "Oakland" → city = Oakland).

export interface AreaOption {
  label: string;
  patterns: string[];
}

export interface AreaGroup {
  region: string;
  areas: AreaOption[];
}

export const AREA_GROUPS: AreaGroup[] = [
  {
    region: "San Francisco",
    areas: [
      { label: "Mission", patterns: ["Mission", "Mission Dolores"] },
      { label: "Castro", patterns: ["Castro"] },
      { label: "SoMa", patterns: ["SoMa", "South of Market"] },
      { label: "Hayes Valley", patterns: ["Hayes Valley"] },
      { label: "Noe Valley", patterns: ["Noe Valley"] },
      { label: "Richmond", patterns: ["Richmond"] },
      { label: "Sunset", patterns: ["Sunset"] },
      { label: "Haight-Ashbury", patterns: ["Haight"] },
      { label: "North Beach", patterns: ["North Beach"] },
      { label: "Marina", patterns: ["Marina"] },
      { label: "Pacific Heights", patterns: ["Pacific Heights"] },
      { label: "Nob Hill / Tenderloin", patterns: ["Nob Hill", "Tenderloin"] },
      { label: "Financial District", patterns: ["Financial District", "Union Square"] },
      { label: "Bernal / Potrero / Dogpatch", patterns: ["Bernal", "Potrero", "Dogpatch"] },
    ],
  },
  {
    region: "East Bay",
    areas: [
      { label: "Oakland", patterns: ["Oakland", "Temescal", "Rockridge", "Grand Lake"] },
      { label: "Berkeley", patterns: ["Berkeley", "Elmwood", "Shattuck"] },
      { label: "Alameda", patterns: ["Alameda"] },
      { label: "San Leandro", patterns: ["San Leandro"] },
      { label: "Fremont", patterns: ["Fremont"] },
      { label: "Hayward", patterns: ["Hayward"] },
      { label: "Pleasanton", patterns: ["Pleasanton"] },
      { label: "Livermore", patterns: ["Livermore"] },
      { label: "Walnut Creek", patterns: ["Walnut Creek"] },
      { label: "Concord", patterns: ["Concord"] },
      { label: "Richmond", patterns: ["Richmond"] },
    ],
  },
  {
    region: "Peninsula",
    areas: [
      { label: "Palo Alto", patterns: ["Palo Alto"] },
      { label: "Mountain View", patterns: ["Mountain View"] },
      { label: "Menlo Park", patterns: ["Menlo Park"] },
      { label: "San Mateo", patterns: ["San Mateo"] },
      { label: "Burlingame", patterns: ["Burlingame"] },
      { label: "Redwood City", patterns: ["Redwood City"] },
      { label: "Daly City", patterns: ["Daly City"] },
      { label: "South San Francisco", patterns: ["South San Francisco"] },
      { label: "San Carlos", patterns: ["San Carlos"] },
      { label: "Half Moon Bay", patterns: ["Half Moon Bay"] },
    ],
  },
  {
    region: "South Bay",
    areas: [
      { label: "San Jose", patterns: ["San Jose", "Willow Glen"] },
      { label: "Los Gatos", patterns: ["Los Gatos"] },
      { label: "Santa Clara", patterns: ["Santa Clara"] },
      { label: "Sunnyvale", patterns: ["Sunnyvale"] },
      { label: "Cupertino", patterns: ["Cupertino"] },
      { label: "Milpitas", patterns: ["Milpitas"] },
      { label: "Saratoga", patterns: ["Saratoga"] },
    ],
  },
  {
    region: "Marin",
    areas: [
      { label: "Mill Valley", patterns: ["Mill Valley"] },
      { label: "Sausalito", patterns: ["Sausalito"] },
      { label: "San Rafael", patterns: ["San Rafael"] },
      { label: "Novato", patterns: ["Novato"] },
    ],
  },
  {
    region: "North Bay",
    areas: [
      { label: "Napa", patterns: ["Napa"] },
      { label: "Santa Rosa", patterns: ["Santa Rosa"] },
      { label: "Petaluma", patterns: ["Petaluma"] },
      { label: "Vallejo", patterns: ["Vallejo"] },
      { label: "Fairfield", patterns: ["Fairfield"] },
    ],
  },
];

// Flat lookup: area label → patterns. Used by the search route to resolve a
// selected area back to its ILIKE patterns.
export const AREA_PATTERNS: Record<string, string[]> = Object.fromEntries(
  AREA_GROUPS.flatMap((g) => g.areas.map((a) => [a.label, a.patterns]))
);

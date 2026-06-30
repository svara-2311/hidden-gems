export interface Source {
  type: "reddit" | "submission" | "llm";
  url: string;
  quote: string;
}

export interface Place {
  id: string;
  name: string;
  neighborhood: string;
  city: string | null;
  region: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  website: string | null;
  opening_hours: string | null;
  google_maps_url: string;
  photo_url: string | null;
  editorial_summary: string;
  vibe_tags: string[];
  specialties: string[];
  famous_for: string;
  sources: Source[];
  verified: boolean;
  created_at: Date;
}

export interface SearchResult extends Place {
  match_blurb: string;
  similarity: number;
  // Which of the user's selected vibe/drink preferences this place actually has.
  matched_vibes?: string[];
  matched_drinks?: string[];
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
  // Set when an area filter was broadened (e.g. to its region) to avoid no results.
  expandedArea?: string | null;
}

// Shape returned by $queryRawUnsafe — sources and vibe_tags need casting
export interface RawPlace {
  id: string;
  name: string;
  neighborhood: string;
  city: string | null;
  region: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  website: string | null;
  opening_hours: string | null;
  google_maps_url: string;
  photo_url: string | null;
  editorial_summary: string;
  vibe_tags: string[];
  specialties: string[];
  famous_for: string;
  sources: unknown;
  verified: boolean;
  created_at: Date;
  similarity: number;
}

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
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
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

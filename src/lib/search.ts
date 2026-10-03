/**
 * search.ts — the retrieval core, extracted from the search route.
 *
 * `retrieveCandidates` turns a parsed user search (query + prefs) into the raw
 * pgvector candidate set, applying the "area is the only hard filter, and it
 * broadens when sparse" rule. It stops short of re-ranking (see ranking.ts) and
 * blurb generation (a per-request presentation concern that lives in the route),
 * so the eval harness can reproduce production retrieval exactly — same SQL,
 * same broadening, same embedding — without spinning up HTTP or calling Groq.
 */

import { prisma } from "@/lib/prisma";
import { getEmbedding } from "@/lib/openai";
import { AREA_GROUPS, AREA_PATTERNS } from "@/taxonomy";
import type { RawPlace } from "@/types";

// How many rows to pull from pgvector before re-ranking down to the final page.
export const CANDIDATE_LIMIT = 30;
// Below this many area-filtered results, broaden the area to its whole region.
const MIN_AREA_RESULTS = 4;

const SELECT_COLUMNS = `
  id, name, neighborhood, city, region, address,
  latitude, longitude, website, opening_hours,
  google_maps_url, photo_url, editorial_summary,
  vibe_tags, specialties, famous_for, sources, verified, created_at`;

// ILIKE patterns for the exact areas the user picked.
function patternsForAreas(areas: string[]): string[] {
  return areas.flatMap((a) => AREA_PATTERNS[a] ?? [a]);
}

// Broaden the selected areas to every area in the same region group(s) —
// e.g. picking "Mission" broadens to all of San Francisco.
function regionPatternsForAreas(areas: string[]): { patterns: string[]; regions: string[] } {
  const groups = AREA_GROUPS.filter((g) => g.areas.some((a) => areas.includes(a.label)));
  return {
    patterns: groups.flatMap((g) => g.areas.flatMap((a) => a.patterns)),
    regions: groups.map((g) => g.region),
  };
}

export interface SearchInput {
  query: string;
  areas: string[];
  vibes: string[];
  drinks: string[];
}

export interface Retrieval {
  candidates: RawPlace[];
  // Set when an area filter was broadened (to its region, or the whole Bay Area).
  expandedArea: string | null;
  // The query embedding, or null for a pure filter search with no text. Exposed
  // so callers/evals can inspect or cache it; blurbs don't need it.
  embedding: number[] | null;
}

export interface RetrieveOptions {
  candidateLimit?: number;
}

export async function retrieveCandidates(
  { query, areas, vibes, drinks }: SearchInput,
  { candidateLimit = CANDIDATE_LIMIT }: RetrieveOptions = {}
): Promise<Retrieval> {
  // Vibe/drink preferences are ranking signals, not filters: fold them into the
  // text we embed so semantic search naturally surfaces matching places.
  const semanticText = [query, ...vibes, ...drinks].filter(Boolean).join(" ");
  const embedding = semanticText ? await getEmbedding(semanticText) : null;

  // Run the candidate query with an optional area filter (area is the only hard
  // constraint — everything else just ranks).
  const fetchCandidates = async (areaPatterns: string[] | null): Promise<RawPlace[]> => {
    const params: unknown[] = [];
    const where = ["verified = true", "vibe_embedding IS NOT NULL"];

    if (areaPatterns && areaPatterns.length > 0) {
      const clauses = areaPatterns.map((p) => {
        params.push(`%${p}%`);
        const i = params.length;
        return `(neighborhood ILIKE $${i} OR city ILIKE $${i})`;
      });
      where.push(`(${clauses.join(" OR ")})`);
    }

    let similaritySelect = "1 AS similarity";
    let orderBy = "ORDER BY created_at DESC";
    if (embedding) {
      params.push(`[${embedding.join(",")}]`);
      const i = params.length;
      similaritySelect = `1 - (vibe_embedding <=> $${i}::vector) AS similarity`;
      orderBy = `ORDER BY vibe_embedding <=> $${i}::vector`;
    }

    return prisma.$queryRawUnsafe<RawPlace[]>(
      `SELECT ${SELECT_COLUMNS}, ${similaritySelect}
       FROM places
       WHERE ${where.join(" AND ")}
       ${orderBy}
       LIMIT ${candidateLimit}`,
      ...params
    );
  };

  // Area, with graceful broadening so we (almost) never return nothing.
  let candidates: RawPlace[] = [];
  let expandedArea: string | null = null;
  if (areas.length > 0) {
    candidates = await fetchCandidates(patternsForAreas(areas));
    if (candidates.length < MIN_AREA_RESULTS) {
      const { patterns, regions } = regionPatternsForAreas(areas);
      const broadened = await fetchCandidates(patterns);
      if (broadened.length > candidates.length) {
        candidates = broadened;
        expandedArea = regions.join(" & ");
      }
    }
    if (candidates.length === 0) {
      candidates = await fetchCandidates(null);
      expandedArea = "the whole Bay Area";
    }
  } else {
    candidates = await fetchCandidates(null);
  }

  return { candidates, expandedArea, embedding };
}

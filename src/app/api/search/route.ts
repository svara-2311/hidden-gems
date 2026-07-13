import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEmbedding } from "@/lib/openai";
import { generateMatchBlurb } from "@/lib/groq";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { AREA_GROUPS, AREA_PATTERNS, VIBE_TAGS, DRINK_TYPES } from "@/taxonomy";
import type { RawPlace, SearchResult, Source } from "@/types";

const VIBE_SET = new Set<string>(VIBE_TAGS);
const DRINK_SET = new Set<string>(DRINK_TYPES);

// How many rows to pull from pgvector before re-ranking down to the final page.
const CANDIDATE_LIMIT = 30;
const PAGE_SIZE = 12;
// Below this many area-filtered results, broaden the area to its whole region.
const MIN_AREA_RESULTS = 4;
// Each matched vibe/drink nudges a result up without ever excluding others.
const MATCH_BONUS = 0.04;

const SELECT_COLUMNS = `
  id, name, neighborhood, city, region, address,
  latitude, longitude, website, opening_hours,
  google_maps_url, photo_url, editorial_summary,
  vibe_tags, specialties, famous_for, sources, verified, created_at`;

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  if (typeof v === "string" && v.trim()) return [v.trim()];
  return [];
}

function asArray(v: unknown): string[] {
  return Array.isArray(v) ? v : [];
}

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

export async function POST(req: NextRequest) {
  try {
    // Each search hits OpenAI (embedding) + Groq (blurbs), so cap per-IP spend.
    const rl = rateLimit(`search:${clientIp(req)}`, { capacity: 10, refillPerSec: 0.5 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many searches — give it a moment and try again." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    const body = (await req.json()) as {
      query?: string;
      neighborhood?: string;
      areas?: unknown;
      vibes?: unknown;
      drinks?: unknown;
    };

    const trimmedQuery = body.query?.trim() ?? "";

    // `areas` supersedes the legacy single `neighborhood` string.
    const areas = asStringArray(body.areas);
    if (body.neighborhood?.trim()) areas.push(body.neighborhood.trim());
    const vibes = asStringArray(body.vibes).filter((v) => VIBE_SET.has(v));
    const drinks = asStringArray(body.drinks).filter((d) => DRINK_SET.has(d));

    if (!trimmedQuery && areas.length === 0 && vibes.length === 0 && drinks.length === 0) {
      return NextResponse.json(
        { error: "Enter a search or pick at least one preference." },
        { status: 400 }
      );
    }

    // Vibe/drink preferences are ranking signals, not filters: fold them into
    // the text we embed so semantic search naturally surfaces matching places.
    const semanticText = [trimmedQuery, ...vibes, ...drinks].filter(Boolean).join(" ");
    const embedding = semanticText ? await getEmbedding(semanticText) : null;

    // Run the candidate query with an optional area filter (area is the only
    // hard constraint — everything else just ranks).
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
         LIMIT ${CANDIDATE_LIMIT}`,
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

    // Re-rank: semantic similarity + a small bonus per matched preference, so
    // exact vibe/drink hits float up without filtering anything out.
    const vibeSet = new Set(vibes);
    const drinkSet = new Set(drinks);
    const ranked = candidates
      .map((place) => {
        const vibe_tags = asArray(place.vibe_tags);
        const specialties = asArray(place.specialties);
        const matched_vibes = vibe_tags.filter((t) => vibeSet.has(t));
        const matched_drinks = specialties.filter((s) => drinkSet.has(s));
        const score =
          Number(place.similarity) +
          MATCH_BONUS * (matched_vibes.length + matched_drinks.length);
        return { place, vibe_tags, specialties, matched_vibes, matched_drinks, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, PAGE_SIZE);

    const results: SearchResult[] = await Promise.all(
      ranked.map(async ({ place, vibe_tags, specialties, matched_vibes, matched_drinks }) => {
        let match_blurb = place.editorial_summary;
        if (trimmedQuery) {
          try {
            match_blurb = await generateMatchBlurb({
              query: trimmedQuery,
              name: place.name,
              neighborhood: place.neighborhood,
              editorial_summary: place.editorial_summary,
              vibe_tags,
            });
          } catch {
            match_blurb = `${place.name} made the list — worth checking out for this vibe.`;
          }
        }

        return {
          ...place,
          vibe_tags,
          specialties,
          sources: (place.sources as Source[]) ?? [],
          similarity: Number(place.similarity),
          match_blurb,
          matched_vibes,
          matched_drinks,
        };
      })
    );

    return NextResponse.json({ results, query: trimmedQuery, expandedArea });
  } catch (error) {
    console.error("[/api/search]", error);
    return NextResponse.json(
      { error: "Search failed. Check your API keys and database connection." },
      { status: 500 }
    );
  }
}

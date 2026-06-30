import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEmbedding } from "@/lib/openai";
import { generateMatchBlurb } from "@/lib/groq";
import { AREA_PATTERNS, VIBE_TAGS, DRINK_TYPES } from "@/taxonomy";
import type { RawPlace, SearchResult, Source } from "@/types";

const VIBE_SET = new Set<string>(VIBE_TAGS);
const DRINK_SET = new Set<string>(DRINK_TYPES);

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  if (typeof v === "string" && v.trim()) return [v.trim()];
  return [];
}

// Build a Postgres text[] array literal from already-trusted (vocab) values.
function arrayLiteral(values: string[]): string {
  return `{${values.map((v) => `"${v}"`).join(",")}}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, neighborhood } = body as {
      query?: string;
      neighborhood?: string;
    };

    const trimmedQuery = query?.trim() ?? "";

    // Filters. `areas` supersedes the legacy single `neighborhood` string.
    const areas = asStringArray((body as { areas?: unknown }).areas);
    if (neighborhood?.trim()) areas.push(neighborhood.trim());
    const vibes = asStringArray((body as { vibes?: unknown }).vibes).filter((v) =>
      VIBE_SET.has(v)
    );
    const drinks = asStringArray((body as { drinks?: unknown }).drinks).filter((d) =>
      DRINK_SET.has(d)
    );

    const hasFilters = areas.length > 0 || vibes.length > 0 || drinks.length > 0;
    if (!trimmedQuery && !hasFilters) {
      return NextResponse.json(
        { error: "Enter a search or pick at least one filter." },
        { status: 400 }
      );
    }

    // Build WHERE clauses + parameters dynamically.
    const params: unknown[] = [];
    const where: string[] = ["verified = true", "vibe_embedding IS NOT NULL"];

    // Area filter: each selected area resolves to ILIKE patterns matched
    // against BOTH neighborhood and city; areas are OR'd together.
    if (areas.length > 0) {
      const areaClauses: string[] = [];
      for (const area of areas) {
        const patterns = AREA_PATTERNS[area] ?? [area];
        for (const p of patterns) {
          params.push(`%${p}%`);
          const idx = params.length;
          areaClauses.push(`(neighborhood ILIKE $${idx} OR city ILIKE $${idx})`);
        }
      }
      if (areaClauses.length) where.push(`(${areaClauses.join(" OR ")})`);
    }

    // Vibe / drink filters: array overlap (any selected value present).
    if (vibes.length > 0) {
      params.push(arrayLiteral(vibes));
      where.push(`vibe_tags && $${params.length}::text[]`);
    }
    if (drinks.length > 0) {
      params.push(arrayLiteral(drinks));
      where.push(`specialties && $${params.length}::text[]`);
    }

    // Semantic ordering only when there's query text; otherwise newest first.
    let similaritySelect = "1 AS similarity";
    let orderBy = "ORDER BY created_at DESC";
    if (trimmedQuery) {
      const embedding = await getEmbedding(trimmedQuery);
      params.push(`[${embedding.join(",")}]`);
      const vecIdx = params.length;
      similaritySelect = `1 - (vibe_embedding <=> $${vecIdx}::vector) AS similarity`;
      orderBy = `ORDER BY vibe_embedding <=> $${vecIdx}::vector`;
    }

    const rawResults = await prisma.$queryRawUnsafe<RawPlace[]>(
      `SELECT
        id, name, neighborhood, city, region, address,
        latitude, longitude, website, opening_hours,
        google_maps_url, photo_url, editorial_summary,
        vibe_tags, specialties, famous_for, sources, verified, created_at,
        ${similaritySelect}
      FROM places
      WHERE ${where.join(" AND ")}
      ${orderBy}
      LIMIT 12`,
      ...params
    );

    const results: SearchResult[] = await Promise.all(
      rawResults.map(async (place) => {
        const vibe_tags = Array.isArray(place.vibe_tags) ? place.vibe_tags : [];
        let match_blurb: string;
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
        } else {
          // Filter-only search: no per-result LLM call, use the editorial line.
          match_blurb = place.editorial_summary;
        }

        return {
          ...place,
          vibe_tags,
          specialties: Array.isArray(place.specialties) ? place.specialties : [],
          sources: (place.sources as Source[]) ?? [],
          similarity: Number(place.similarity),
          match_blurb,
        };
      })
    );

    return NextResponse.json({ results, query: trimmedQuery });
  } catch (error) {
    console.error("[/api/search]", error);
    return NextResponse.json(
      { error: "Search failed. Check your API keys and database connection." },
      { status: 500 }
    );
  }
}

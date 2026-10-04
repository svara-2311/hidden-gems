import { NextRequest, NextResponse } from "next/server";
import { generateMatchBlurb } from "@/lib/groq";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { retrieveCandidates } from "@/lib/search";
import { rankCandidates } from "@/lib/ranking";
import { findSimilarPlace, NAME_EXISTS_THRESHOLD } from "@/lib/places";
import { VIBE_TAGS, DRINK_TYPES } from "@/taxonomy";
import type { SearchResult, Source } from "@/types";

const VIBE_SET = new Set<string>(VIBE_TAGS);
const DRINK_SET = new Set<string>(DRINK_TYPES);

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  if (typeof v === "string" && v.trim()) return [v.trim()];
  return [];
}

// A short query that reads like a proper noun — "Mildang Cafe", "Blue Bottle
// Coffee" — rather than a mood/vibe description like "quiet corner to read".
// Used to decide whether a search with no close name match in the DB should
// prompt "add this cafe?" instead of just silently showing unrelated results.
const PLACE_NAME_HINT = /\b(cafe|caff[eè]|coffee|roasters?|roastery|espresso|brew(?:ery)?|bakery)\b/i;

function looksLikePlaceName(query: string): boolean {
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 6) return false;
  if (PLACE_NAME_HINT.test(query)) return true;
  const capitalized = words.filter((w) => /^[A-Z]/.test(w));
  return capitalized.length >= Math.ceil(words.length * 0.6);
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

    // If the query looks like a specific cafe's name and nothing in the DB is
    // a close name match, surface a prompt to add it instead of silently
    // falling back to semantically-nearby-but-unrelated results.
    let notFoundCafe: string | null = null;
    if (trimmedQuery && looksLikePlaceName(trimmedQuery)) {
      const existing = await findSimilarPlace(trimmedQuery, NAME_EXISTS_THRESHOLD);
      if (!existing) notFoundCafe = trimmedQuery;
    }

    // Retrieve (embedding + pgvector + area broadening), then re-rank. Both live
    // in src/lib so the eval harness can reproduce them without HTTP — see evals/.
    const { candidates, expandedArea } = await retrieveCandidates({
      query: trimmedQuery,
      areas,
      vibes,
      drinks,
    });
    const ranked = rankCandidates(candidates, { vibes, drinks });

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
          } catch (err) {
            console.error("[search] blurb generation failed", err);
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

    // Minimal structured log of input → ranked output. Not user tracking — it's
    // the raw material for an eval set (query/prefs vs. what ranked and how
    // strongly). No IP or PII is recorded here. See evals/ for the harness that
    // turns labeled versions of these into retrieval metrics.
    console.log(
      "[search]",
      JSON.stringify({
        query: trimmedQuery,
        areas,
        vibes,
        drinks,
        expandedArea,
        results: results.map((r) => ({ id: r.id, similarity: r.similarity })),
      })
    );

    return NextResponse.json({ results, query: trimmedQuery, expandedArea, notFoundCafe });
  } catch (error) {
    console.error("[/api/search]", error);
    return NextResponse.json(
      { error: "Search failed. Check your API keys and database connection." },
      { status: 500 }
    );
  }
}

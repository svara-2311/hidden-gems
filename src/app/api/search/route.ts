import { NextRequest, NextResponse } from "next/server";
import { generateMatchBlurb } from "@/lib/groq";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { retrieveCandidates } from "@/lib/search";
import { rankCandidates } from "@/lib/ranking";
import { VIBE_TAGS, DRINK_TYPES } from "@/taxonomy";
import type { SearchResult, Source } from "@/types";

const VIBE_SET = new Set<string>(VIBE_TAGS);
const DRINK_SET = new Set<string>(DRINK_TYPES);

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  if (typeof v === "string" && v.trim()) return [v.trim()];
  return [];
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

    return NextResponse.json({ results, query: trimmedQuery, expandedArea });
  } catch (error) {
    console.error("[/api/search]", error);
    return NextResponse.json(
      { error: "Search failed. Check your API keys and database connection." },
      { status: 500 }
    );
  }
}

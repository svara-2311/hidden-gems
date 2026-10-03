/**
 * ranking.ts — the pure re-ranking step, extracted from the search route so it
 * can be unit-tested and parameter-swept by the eval harness (evals/) without a
 * database, HTTP server, or any API calls.
 *
 * Contract: given the candidate rows pgvector returned (each already carrying a
 * `similarity` in [0,1]) plus the user's vibe/drink preferences, score every
 * candidate as `similarity + MATCH_BONUS * (#matched vibes + #matched drinks)`
 * and return the top `pageSize`, highest score first. Preferences only ever add
 * score — they never drop a candidate (the "filters rank, they don't exclude"
 * invariant).
 */

import type { RawPlace } from "@/types";

// Each matched vibe/drink nudges a result up without ever excluding others.
// This is a tuned knob, not a magic constant — evals/tune.ts sweeps it.
export const DEFAULT_MATCH_BONUS = 0.04;
export const DEFAULT_PAGE_SIZE = 12;

export interface RankedPlace {
  place: RawPlace;
  vibe_tags: string[];
  specialties: string[];
  matched_vibes: string[];
  matched_drinks: string[];
  score: number;
}

export interface RankOptions {
  vibes: string[];
  drinks: string[];
  matchBonus?: number;
  pageSize?: number;
}

function asArray(v: unknown): string[] {
  return Array.isArray(v) ? v : [];
}

export function rankCandidates(
  candidates: RawPlace[],
  { vibes, drinks, matchBonus = DEFAULT_MATCH_BONUS, pageSize = DEFAULT_PAGE_SIZE }: RankOptions
): RankedPlace[] {
  const vibeSet = new Set(vibes);
  const drinkSet = new Set(drinks);

  return candidates
    .map((place) => {
      const vibe_tags = asArray(place.vibe_tags);
      const specialties = asArray(place.specialties);
      const matched_vibes = vibe_tags.filter((t) => vibeSet.has(t));
      const matched_drinks = specialties.filter((s) => drinkSet.has(s));
      const score =
        Number(place.similarity) + matchBonus * (matched_vibes.length + matched_drinks.length);
      return { place, vibe_tags, specialties, matched_vibes, matched_drinks, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, pageSize);
}

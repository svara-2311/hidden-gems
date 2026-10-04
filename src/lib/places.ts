/**
 * places.ts — insert a user-submitted cafe: enrich (vibe/drink/known-for),
 * embed, and write to the DB, tagged with a "submission" source so the UI can
 * mark it as community-added. Used by the "add a cafe" endpoint.
 */

import { randomUUID } from "crypto";
import { prisma } from "./prisma";
import { getEmbedding } from "./openai";
import { enrichBatch } from "./enrich";
import type { Source } from "@/types";

export interface AddPlaceInput {
  name: string;
  neighborhood: string;
  city?: string | null;
  region?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  website?: string | null;
  opening_hours?: string | null;
  google_maps_url?: string;
  photo_url?: string | null;
  editorial_summary?: string;
  rating?: number | null;
  user_rating_count?: number | null;
}

export interface AddedPlace {
  id: string;
  name: string;
  neighborhood: string;
  editorial_summary: string;
  vibe_tags: string[];
  specialties: string[];
  famous_for: string;
}

// Build a Postgres text[] literal with proper escaping. Shared with
// scripts/seed.ts, which writes rows the same way.
export function pgTextArray(values: string[]): string {
  return `{${values
    .map((v) => `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`)
    .join(",")}}`;
}

// A place already in the DB with a very similar name. A bare ILIKE only
// caught near-exact strings, so "Blue Bottle" vs "Bluebottle Coffee" slipped
// through. Use pg_trgm fuzzy matching instead: similarity() handles
// typos/reordering, and word_similarity($name, candidate) handles the case
// where one name is a superset of the other (spacing/suffix differences).
//
// 0.4 is deliberately loose — it's the dedupe guard on new submissions, where
// a false positive just means "confirm this isn't a duplicate" (cheap) and a
// miss means an actual duplicate gets inserted (expensive). Calibrated against
// the real DB: unrelated names that happen to share a word like "Cafe" land
// around 0.4-0.5 (e.g. "Mildang cafe" vs "Milli Cafe" scores 0.5), while real
// typo'd variants of an existing name score 0.6+ ("Bluebottle" vs "Blue
// Bottle Coffee - Mint Plaza" scores 0.69). Callers that need "does this
// specific place already exist" (not "might this be a duplicate") should pass
// a stricter threshold.
const NAME_MATCH_THRESHOLD = 0.4;

// Stricter bar for "this specific place already exists" (vs. "might be a
// duplicate, ask the user to confirm"). Used wherever a false match would
// silently block something that should have gone through, e.g. the add-cafe
// flow mistaking "Mildang" for the unrelated "Milli Cafe".
export const NAME_EXISTS_THRESHOLD = 0.6;

export async function findSimilarPlace(
  name: string,
  threshold = NAME_MATCH_THRESHOLD
): Promise<{ name: string } | null> {
  const rows = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    `SELECT name
       FROM places
      WHERE GREATEST(similarity(name, $1), word_similarity($1, name)) >= $2
      ORDER BY GREATEST(similarity(name, $1), word_similarity($1, name)) DESC
      LIMIT 1`,
    name.trim(),
    threshold
  );
  return rows[0] ?? null;
}

export async function addPlace(input: AddPlaceInput): Promise<AddedPlace> {
  const name = input.name.trim();
  const neighborhood = input.neighborhood?.trim() || "San Francisco";
  const editorial_summary =
    input.editorial_summary?.trim() || `${name} is a coffee spot in ${neighborhood}.`;

  // Enrich + embed (same pipeline as the seed, one place at a time).
  const [enriched] = await enrichBatch([{ name, neighborhood, editorial_summary }]);
  const embeddingText = `${editorial_summary} Vibe: ${enriched.vibe_tags.join(
    ", "
  )}. Known for: ${enriched.specialties.join(", ")}`;
  const embedding = await getEmbedding(embeddingText);

  const id = randomUUID();
  const sources: Source[] = [
    { type: "submission", url: input.google_maps_url ?? "", quote: "Added by the community" },
  ];

  await prisma.$executeRawUnsafe(
    `INSERT INTO places
       (id, name, neighborhood, city, region, address,
        latitude, longitude, website, opening_hours,
        google_maps_url, photo_url, editorial_summary,
        rating, user_rating_count,
        vibe_tags, specialties, famous_for,
        vibe_embedding, sources, verified)
     VALUES
       ($1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10,
        $11, $12, $13,
        $14, $15,
        $16::text[], $17::text[], $18,
        $19::vector, $20::jsonb, $21)`,
    id,
    name,
    neighborhood,
    input.city ?? null,
    input.region ?? "SF",
    input.address ?? "",
    input.latitude ?? null,
    input.longitude ?? null,
    input.website ?? null,
    input.opening_hours ?? null,
    input.google_maps_url ?? `https://maps.google.com/?q=${encodeURIComponent(name)}`,
    input.photo_url ?? null,
    editorial_summary,
    input.rating ?? null,
    input.user_rating_count ?? null,
    pgTextArray(enriched.vibe_tags),
    pgTextArray(enriched.specialties),
    enriched.famous_for,
    `[${embedding.join(",")}]`,
    JSON.stringify(sources),
    true
  );

  return {
    id,
    name,
    neighborhood,
    editorial_summary,
    vibe_tags: enriched.vibe_tags,
    specialties: enriched.specialties,
    famous_for: enriched.famous_for,
  };
}

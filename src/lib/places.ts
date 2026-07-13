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

// Build a Postgres text[] literal with proper escaping.
function pgTextArray(values: string[]): string {
  return `{${values
    .map((v) => `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`)
    .join(",")}}`;
}

// A place already in the DB with a very similar name (dedupe guard). A bare
// ILIKE only caught near-exact strings, so "Blue Bottle" vs "Bluebottle Coffee"
// slipped through. Use pg_trgm fuzzy matching instead: similarity() handles
// typos/reordering, and word_similarity($name, candidate) handles the case
// where one name is a superset of the other (spacing/suffix differences).
const NAME_MATCH_THRESHOLD = 0.4;

export async function findSimilarPlace(name: string): Promise<{ name: string } | null> {
  const rows = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    `SELECT name
       FROM places
      WHERE GREATEST(similarity(name, $1), word_similarity($1, name)) >= $2
      ORDER BY GREATEST(similarity(name, $1), word_similarity($1, name)) DESC
      LIMIT 1`,
    name.trim(),
    NAME_MATCH_THRESHOLD
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
        vibe_tags, specialties, famous_for,
        vibe_embedding, sources, verified)
     VALUES
       ($1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10,
        $11, $12, $13,
        $14::text[], $15::text[], $16,
        $17::vector, $18::jsonb, $19)`,
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

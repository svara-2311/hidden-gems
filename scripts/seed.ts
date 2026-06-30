/**
 * seed.ts — the single seed for the `places` database.
 *
 * One pass, per batch: fetch from Google Places → LLM-enrich vibe_tags +
 * specialties (controlled vocab, gpt-4o-mini) → generate a vector embedding →
 * upsert into the database. There is no separate enrich step.
 *
 * Run:          npm run seed          (adds any places not already in the DB)
 * Re-seed all:  RESET=true npm run seed   (truncates first, re-fetches+enriches)
 *
 * Required env: GOOGLE_PLACES_API_KEY, OPENAI_API_KEY, DATABASE_URL
 */

import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";
import * as dotenv from "dotenv";
import path from "path";
import { randomUUID } from "crypto";
import { enrichBatch } from "@/lib/enrich";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const PLACES_API_BASE = "https://places.googleapis.com/v1";

// ── Types ──────────────────────────────────────────────────────────────────

interface SearchArea {
  label: string;
  neighborhood: string;
  city: string;
  region: string;
  lat: number;
  lng: number;
  radiusM: number;
}

interface RawPlaceFromApi {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  websiteUri?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  googleMapsUri?: string;
  photos?: Array<{ name: string }>;
  editorialSummary?: { text: string };
  addressComponents?: Array<{ longText: string; types: string[] }>;
}

interface PlacesTextSearchResponse {
  places?: RawPlaceFromApi[];
}

interface EnrichedPlace {
  name: string;
  neighborhood: string;
  city: string;
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
}

// ── Search Areas ──────────────────────────────────────────────────────────

const SEARCH_AREAS: SearchArea[] = [
  // San Francisco
  { label: "Mission",         neighborhood: "Mission",         city: "San Francisco", region: "SF",       lat: 37.7599, lng: -122.4148, radiusM: 1500 },
  { label: "Castro",          neighborhood: "Castro",          city: "San Francisco", region: "SF",       lat: 37.7609, lng: -122.4350, radiusM: 1000 },
  { label: "SoMa",            neighborhood: "SoMa",            city: "San Francisco", region: "SF",       lat: 37.7785, lng: -122.4056, radiusM: 1500 },
  { label: "Hayes Valley",    neighborhood: "Hayes Valley",    city: "San Francisco", region: "SF",       lat: 37.7758, lng: -122.4244, radiusM: 1000 },
  { label: "Noe Valley",      neighborhood: "Noe Valley",      city: "San Francisco", region: "SF",       lat: 37.7510, lng: -122.4337, radiusM: 1000 },
  { label: "Inner Richmond",  neighborhood: "Inner Richmond",  city: "San Francisco", region: "SF",       lat: 37.7785, lng: -122.4660, radiusM: 1200 },
  { label: "Outer Richmond",  neighborhood: "Outer Richmond",  city: "San Francisco", region: "SF",       lat: 37.7798, lng: -122.4932, radiusM: 1200 },
  { label: "Inner Sunset",    neighborhood: "Inner Sunset",    city: "San Francisco", region: "SF",       lat: 37.7630, lng: -122.4663, radiusM: 1200 },
  { label: "Outer Sunset",    neighborhood: "Outer Sunset",    city: "San Francisco", region: "SF",       lat: 37.7529, lng: -122.4952, radiusM: 1500 },
  { label: "Haight-Ashbury",  neighborhood: "Haight-Ashbury",  city: "San Francisco", region: "SF",       lat: 37.7694, lng: -122.4486, radiusM: 1000 },
  { label: "North Beach",     neighborhood: "North Beach",     city: "San Francisco", region: "SF",       lat: 37.8061, lng: -122.4103, radiusM: 1000 },
  { label: "Marina",          neighborhood: "Marina",          city: "San Francisco", region: "SF",       lat: 37.8026, lng: -122.4361, radiusM: 1000 },
  { label: "Pacific Heights", neighborhood: "Pacific Heights", city: "San Francisco", region: "SF",       lat: 37.7919, lng: -122.4377, radiusM: 1000 },
  { label: "NOPA",            neighborhood: "NOPA",            city: "San Francisco", region: "SF",       lat: 37.7758, lng: -122.4379, radiusM: 800  },
  { label: "Potrero Hill",    neighborhood: "Potrero Hill",    city: "San Francisco", region: "SF",       lat: 37.7598, lng: -122.3985, radiusM: 1000 },
  { label: "Bernal Heights",  neighborhood: "Bernal Heights",  city: "San Francisco", region: "SF",       lat: 37.7395, lng: -122.4152, radiusM: 1000 },
  { label: "Cole Valley",     neighborhood: "Cole Valley",     city: "San Francisco", region: "SF",       lat: 37.7658, lng: -122.4497, radiusM: 700  },
  { label: "Dogpatch",        neighborhood: "Dogpatch",        city: "San Francisco", region: "SF",       lat: 37.7584, lng: -122.3892, radiusM: 1000 },
  { label: "Financial District", neighborhood: "Financial District", city: "San Francisco", region: "SF", lat: 37.7946, lng: -122.3986, radiusM: 800  },
  { label: "Tenderloin",      neighborhood: "Tenderloin",      city: "San Francisco", region: "SF",       lat: 37.7838, lng: -122.4139, radiusM: 800  },
  // East Bay
  { label: "Temescal",        neighborhood: "Temescal",        city: "Oakland",       region: "Bay Area", lat: 37.8283, lng: -122.2585, radiusM: 1000 },
  { label: "Rockridge",       neighborhood: "Rockridge",       city: "Oakland",       region: "Bay Area", lat: 37.8376, lng: -122.2539, radiusM: 1200 },
  { label: "Downtown Oakland", neighborhood: "Downtown",       city: "Oakland",       region: "Bay Area", lat: 37.8044, lng: -122.2712, radiusM: 1200 },
  { label: "Grand Lake",      neighborhood: "Grand Lake",      city: "Oakland",       region: "Bay Area", lat: 37.8136, lng: -122.2525, radiusM: 800  },
  { label: "Downtown Berkeley", neighborhood: "Downtown",      city: "Berkeley",      region: "Bay Area", lat: 37.8716, lng: -122.2727, radiusM: 1500 },
  { label: "North Berkeley",  neighborhood: "North Berkeley",  city: "Berkeley",      region: "Bay Area", lat: 37.8793, lng: -122.2681, radiusM: 1000 },
  { label: "Elmwood",         neighborhood: "Elmwood",         city: "Berkeley",      region: "Bay Area", lat: 37.8573, lng: -122.2596, radiusM: 800  },
  // Peninsula
  { label: "Palo Alto",       neighborhood: "Downtown",        city: "Palo Alto",     region: "Bay Area", lat: 37.4419, lng: -122.1430, radiusM: 2000 },
  { label: "Mountain View",   neighborhood: "Downtown",        city: "Mountain View", region: "Bay Area", lat: 37.3861, lng: -122.0839, radiusM: 2000 },
  { label: "Menlo Park",      neighborhood: "Downtown",        city: "Menlo Park",    region: "Bay Area", lat: 37.4530, lng: -122.1817, radiusM: 1500 },
  { label: "San Mateo",       neighborhood: "Downtown",        city: "San Mateo",     region: "Bay Area", lat: 37.5630, lng: -122.3255, radiusM: 2000 },
  { label: "Burlingame",      neighborhood: "Burlingame",      city: "Burlingame",    region: "Bay Area", lat: 37.5792, lng: -122.3478, radiusM: 1500 },
  { label: "Redwood City",    neighborhood: "Downtown",        city: "Redwood City",  region: "Bay Area", lat: 37.4852, lng: -122.2364, radiusM: 2000 },
  // South Bay
  { label: "Downtown San Jose", neighborhood: "Downtown",      city: "San Jose",      region: "Bay Area", lat: 37.3382, lng: -121.8863, radiusM: 2000 },
  { label: "Willow Glen",     neighborhood: "Willow Glen",     city: "San Jose",      region: "Bay Area", lat: 37.3077, lng: -121.8954, radiusM: 1500 },
  { label: "Los Gatos",       neighborhood: "Los Gatos",       city: "Los Gatos",     region: "Bay Area", lat: 37.2358, lng: -121.9624, radiusM: 2000 },
  // Marin
  { label: "Mill Valley",     neighborhood: "Mill Valley",     city: "Mill Valley",   region: "Bay Area", lat: 37.9060, lng: -122.5453, radiusM: 1500 },
  { label: "Sausalito",       neighborhood: "Sausalito",       city: "Sausalito",     region: "Bay Area", lat: 37.8590, lng: -122.4852, radiusM: 1500 },
  { label: "San Rafael",      neighborhood: "San Rafael",      city: "San Rafael",    region: "Bay Area", lat: 37.9735, lng: -122.5311, radiusM: 2000 },
];

const PLACES_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.websiteUri",
  "places.regularOpeningHours",
  "places.googleMapsUri",
  "places.photos",
  "places.editorialSummary",
  "places.addressComponents",
].join(",");

// ── Google Places Helpers ─────────────────────────────────────────────────

async function fetchAreaCafes(
  area: SearchArea,
  apiKey: string
): Promise<RawPlaceFromApi[]> {
  const res = await fetch(`${PLACES_API_BASE}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": PLACES_FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: "coffee shop cafe",
      maxResultCount: 20,
      includedType: "coffee_shop",
      locationBias: {
        circle: {
          center: { latitude: area.lat, longitude: area.lng },
          radius: area.radiusM,
        },
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Places API ${res.status} for ${area.label}: ${body}`);
  }

  const data = (await res.json()) as PlacesTextSearchResponse;
  return data.places ?? [];
}

async function resolvePhotoUrl(
  photoName: string,
  apiKey: string
): Promise<string | null> {
  try {
    const res = await fetch(
      `${PLACES_API_BASE}/${photoName}/media?maxHeightPx=800&maxWidthPx=800&skipHttpRedirect=true&key=${apiKey}`
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { photoUri?: string };
    return data.photoUri ?? null;
  } catch {
    return null;
  }
}

function extractAddressComponent(
  components: Array<{ longText: string; types: string[] }>,
  ...typeKeys: string[]
): string | null {
  for (const key of typeKeys) {
    const match = components.find((c) => c.types?.includes(key));
    if (match) return match.longText;
  }
  return null;
}

// ── OpenAI Embeddings (batched) ───────────────────────────────────────────

async function batchEmbeddings(texts: string[]): Promise<number[][]> {
  const BATCH_SIZE = 100;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    process.stdout.write(`  ↗  Embedding batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(texts.length / BATCH_SIZE)}...`);
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: batch,
      dimensions: 1536,
    });
    allEmbeddings.push(...response.data.map((d) => d.embedding));
    console.log(" ✓");
  }

  return allEmbeddings;
}

// ── DB Insert ─────────────────────────────────────────────────────────────

async function upsertPlace(place: EnrichedPlace, embedding: number[]): Promise<void> {
  const embeddingStr = `[${embedding.join(",")}]`;
  const tagsLiteral = `{${place.vibe_tags
    .map((t) => `"${t.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`)
    .join(",")}}`;
  const specialtiesLiteral = `{${place.specialties
    .map((s) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`)
    .join(",")}}`;

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
        $17::vector, $18::jsonb, $19)
     ON CONFLICT (id) DO NOTHING`,
    randomUUID(),
    place.name,
    place.neighborhood,
    place.city,
    place.region,
    place.address,
    place.latitude,
    place.longitude,
    place.website,
    place.opening_hours,
    place.google_maps_url,
    place.photo_url,
    place.editorial_summary,
    tagsLiteral,
    specialtiesLiteral,
    place.famous_for,
    embeddingStr,
    JSON.stringify([]),
    true
  );
}

// ── Utilities ─────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function checkEnv(...keys: string[]): void {
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("\n☕  Hidden Gems — Bay Area Places Seed\n");
  checkEnv("GOOGLE_PLACES_API_KEY", "OPENAI_API_KEY");

  const apiKey = process.env.GOOGLE_PLACES_API_KEY!;

  // Optionally truncate before re-seeding
  if (process.env.RESET === "true") {
    console.log("  ↻  RESET=true — truncating places table...");
    await prisma.$executeRaw`TRUNCATE TABLE places`;
  }

  // Load existing google_maps_urls to skip already-seeded places
  const existing = await prisma.$queryRaw<Array<{ google_maps_url: string }>>`
    SELECT google_maps_url FROM places
  `;
  const existingUrls = new Set(existing.map((r) => r.google_maps_url));
  console.log(`  ℹ  ${existingUrls.size} places already in DB (will be skipped)\n`);

  // ── Phase 1: Fetch all areas ──────────────────────────────────────────

  console.log(`── Phase 1: Fetching ${SEARCH_AREAS.length} areas from Google Places ──\n`);

  const seen = new Map<string, { raw: RawPlaceFromApi; area: SearchArea }>();

  for (const area of SEARCH_AREAS) {
    process.stdout.write(`  📍 ${area.label.padEnd(22)}`);
    try {
      const places = await fetchAreaCafes(area, apiKey);
      let newCount = 0;
      for (const p of places) {
        if (!seen.has(p.id)) {
          seen.set(p.id, { raw: p, area });
          newCount++;
        }
      }
      console.log(`${places.length} results, ${newCount} new (total unique: ${seen.size})`);
    } catch (err) {
      console.log(`ERROR — ${(err as Error).message}`);
    }
    // Small pause between area requests to be polite to the API
    await sleep(200);
  }

  console.log(`\n  ✓  ${seen.size} unique places found across all areas\n`);

  // ── Phase 2: Filter out existing, resolve photos, enrich ─────────────

  const candidates = Array.from(seen.values()).filter(({ raw }) => {
    const url = raw.googleMapsUri ?? "";
    return !existingUrls.has(url);
  });

  if (candidates.length === 0) {
    console.log("  ✓  Nothing new to seed. Run with RESET=true to re-seed everything.\n");
    return;
  }

  // ── Phases 2–4: Enrich → embed → insert in batches of 20 ─────────────
  // Processing in batches means every 20 places are saved to DB immediately,
  // so a mid-run failure doesn't lose all progress.

  const BATCH_SIZE = 20;
  const totalBatches = Math.ceil(candidates.length / BATCH_SIZE);
  let totalInserted = 0;

  console.log(`── Phases 2–4: Enrich → embed → insert (${candidates.length} places, ${totalBatches} batches) ──\n`);

  for (let b = 0; b < totalBatches; b++) {
    const batchCandidates = candidates.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
    const batchLabel = `Batch ${b + 1}/${totalBatches}`;
    console.log(`  ── ${batchLabel} (${batchCandidates.length} places) ──`);

    // Phase 2: Enrich
    const enriched: EnrichedPlace[] = [];
    for (let i = 0; i < batchCandidates.length; i++) {
      const { raw, area } = batchCandidates[i];
      const globalIdx = b * BATCH_SIZE + i + 1;
      const name = raw.displayName?.text ?? "Unknown";

      process.stdout.write(
        `  [${String(globalIdx).padStart(3)}/${candidates.length}] ${name.substring(0, 35).padEnd(36)}`
      );

      const components = raw.addressComponents ?? [];
      const neighborhood =
        extractAddressComponent(components, "neighborhood", "sublocality_level_1") ??
        area.neighborhood;
      const city = extractAddressComponent(components, "locality") ?? area.city;

      const photo_url = raw.photos?.[0]
        ? await resolvePhotoUrl(raw.photos[0].name, apiKey)
        : null;

      const editorial_summary =
        raw.editorialSummary?.text ||
        `${name} is a coffee shop in ${neighborhood}, ${city}.`;

      enriched.push({
        name,
        neighborhood,
        city,
        region: area.region,
        address: raw.formattedAddress ?? "",
        latitude: raw.location?.latitude ?? null,
        longitude: raw.location?.longitude ?? null,
        website: raw.websiteUri ?? null,
        opening_hours: raw.regularOpeningHours?.weekdayDescriptions?.join("; ") ?? null,
        google_maps_url:
          raw.googleMapsUri ?? `https://maps.google.com/?q=${encodeURIComponent(name)}`,
        photo_url,
        editorial_summary,
        // vibe_tags + specialties are filled by the LLM enrichment pass below.
        vibe_tags: [],
        specialties: [],
        famous_for: "",
      });

      console.log("✓");
    }

    // Phase 2b: LLM-enrich vibe_tags + specialties (controlled vocab, gpt-4o-mini)
    process.stdout.write(`  ↗  Enriching ${enriched.length} places (vibe + drinks)...`);
    const enrichResults = await enrichBatch(
      enriched.map((p) => ({
        name: p.name,
        neighborhood: p.neighborhood,
        editorial_summary: p.editorial_summary,
      }))
    );
    enriched.forEach((p, i) => {
      p.vibe_tags = enrichResults[i].vibe_tags;
      p.specialties = enrichResults[i].specialties;
    });
    console.log(" ✓");

    // Phase 3: Embed batch
    process.stdout.write(`  ↗  Embedding ${enriched.length} places...`);
    const texts = enriched.map(
      (p) =>
        `${p.editorial_summary} Vibe: ${p.vibe_tags.join(", ")}. Known for: ${p.specialties.join(", ")}`
    );
    const embeddings = await batchEmbeddings(texts);
    console.log("");

    // Phase 4: Insert batch
    let batchInserted = 0;
    for (let i = 0; i < enriched.length; i++) {
      try {
        await upsertPlace(enriched[i], embeddings[i]);
        batchInserted++;
      } catch (err) {
        console.error(`  ✗  ${enriched[i].name}: ${(err as Error).message}`);
      }
    }
    totalInserted += batchInserted;
    console.log(`  ✓  ${batchLabel} saved: ${batchInserted}/${enriched.length} inserted\n`);
  }

  const [{ count }] = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) AS count FROM places
  `;

  console.log(`
✅  Done!
    Inserted : ${totalInserted} new places
    Total DB : ${Number(count)} places
`);
}

main()
  .catch((err) => {
    console.error("\n❌ Seed failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

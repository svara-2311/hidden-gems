import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/backend/lib/prisma";
import { getEmbedding } from "@/backend/lib/openai";
import { generateMatchBlurb } from "@/backend/lib/groq";
import type { RawPlace, SearchResult, Source } from "@/shared/types";

const MOCK_RESULTS: SearchResult[] = [
  {
    id: "mock-1",
    osm_id: null,
    name: "Sightglass Coffee",
    neighborhood: "SoMa",
    city: "San Francisco",
    region: "SF",
    address: "270 7th St, San Francisco, CA 94103",
    latitude: 37.7749,
    longitude: -122.4094,
    website: "https://sightglasscoffee.com",
    opening_hours: "Mon-Fri 7am-6pm, Sat-Sun 8am-6pm",
    google_maps_url: "https://maps.google.com/?q=Sightglass+Coffee",
    photo_url: null,
    editorial_summary:
      "A cavernous, light-flooded roastery in SoMa with serious espresso and a buzzing creative crowd.",
    vibe_tags: ["airy", "industrial", "specialty coffee", "remote-work friendly"],
    specialties: ["espresso", "pour over", "cold brew"],
    famous_for: "Known for their meticulous single-origin roasts and stunning two-story space.",
    sources: [],
    verified: true,
    created_at: new Date("2024-01-01"),
    match_blurb: "A go-to SoMa spot for serious coffee in a bright, open space.",
    similarity: 0.92,
  },
  {
    id: "mock-2",
    osm_id: null,
    name: "Ritual Coffee Roasters",
    neighborhood: "Mission",
    city: "San Francisco",
    region: "SF",
    address: "1026 Valencia St, San Francisco, CA 94110",
    latitude: 37.7574,
    longitude: -122.4213,
    website: "https://ritualroasters.com",
    opening_hours: "Daily 7am-7pm",
    google_maps_url: "https://maps.google.com/?q=Ritual+Coffee+Roasters+Valencia",
    photo_url: null,
    editorial_summary:
      "Pioneer of SF's third-wave coffee scene, serving precise brews in the heart of the Mission.",
    vibe_tags: ["cozy", "third-wave", "neighborhood staple", "lively"],
    specialties: ["flat white", "cortado", "seasonal pour over"],
    famous_for: "One of SF's original specialty roasters with cult-following blends.",
    sources: [],
    verified: true,
    created_at: new Date("2024-01-01"),
    match_blurb: "A Mission institution for precision coffee and neighborhood energy.",
    similarity: 0.88,
  },
  {
    id: "mock-3",
    osm_id: null,
    name: "Verve Coffee Roasters",
    neighborhood: "Hayes Valley",
    city: "San Francisco",
    region: "SF",
    address: "580 Laguna St, San Francisco, CA 94102",
    latitude: 37.7765,
    longitude: -122.4263,
    website: "https://vervecoffee.com",
    opening_hours: "Daily 7am-6pm",
    google_maps_url: "https://maps.google.com/?q=Verve+Coffee+Hayes+Valley",
    photo_url: null,
    editorial_summary:
      "Santa Cruz import bringing bright, fruit-forward roasts and minimal design to Hayes Valley.",
    vibe_tags: ["minimalist", "bright", "specialty", "quiet"],
    specialties: ["nitro cold brew", "oat latte", "single origin espresso"],
    famous_for: "Fruit-forward roast profiles and a calm, design-forward space.",
    sources: [],
    verified: true,
    created_at: new Date("2024-01-01"),
    match_blurb: "Calm, precise, and beautifully designed — a Hayes Valley gem.",
    similarity: 0.85,
  },
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, neighborhood } = body as { query?: string; neighborhood?: string };

    if (!query?.trim()) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const trimmedQuery = query.trim();
    const trimmedNeighborhood = neighborhood?.trim();

    if (process.env.USE_MOCK_SEARCH === "true") {
      const results = trimmedNeighborhood
        ? MOCK_RESULTS.filter((r) =>
            r.neighborhood.toLowerCase().includes(trimmedNeighborhood.toLowerCase())
          )
        : MOCK_RESULTS;
      return NextResponse.json({ results, query: trimmedQuery });
    }

    // Embed the query
    const embedding = await getEmbedding(trimmedQuery);
    const embeddingStr = `[${embedding.join(",")}]`;

    // pgvector cosine similarity search, optionally scoped to a neighborhood
    const params: unknown[] = [embeddingStr];
    let neighborhoodFilter = "";
    if (trimmedNeighborhood) {
      params.push(`%${trimmedNeighborhood}%`);
      neighborhoodFilter = `AND neighborhood ILIKE $${params.length}`;
    }

    const rawResults = await prisma.$queryRawUnsafe<RawPlace[]>(
      `SELECT
        id, osm_id, name, neighborhood, city, region, address,
        latitude, longitude, website, opening_hours,
        google_maps_url, photo_url, editorial_summary,
        vibe_tags, specialties, famous_for, sources, verified, created_at,
        1 - (vibe_embedding <=> $1::vector) AS similarity
      FROM places
      WHERE verified = true AND vibe_embedding IS NOT NULL
      ${neighborhoodFilter}
      ORDER BY vibe_embedding <=> $1::vector
      LIMIT 6`,
      ...params
    );

    // Generate match blurbs in parallel, with per-result fallback
    const results: SearchResult[] = await Promise.all(
      rawResults.map(async (place) => {
        let match_blurb: string;
        try {
          match_blurb = await generateMatchBlurb({
            query: trimmedQuery,
            name: place.name,
            neighborhood: place.neighborhood,
            editorial_summary: place.editorial_summary,
            vibe_tags: Array.isArray(place.vibe_tags) ? place.vibe_tags : [],
          });
        } catch {
          match_blurb = `${place.name} made the list — worth checking out for this vibe.`;
        }

        return {
          ...place,
          osm_id: place.osm_id !== null ? Number(place.osm_id) : null,
          vibe_tags: Array.isArray(place.vibe_tags) ? place.vibe_tags : [],
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

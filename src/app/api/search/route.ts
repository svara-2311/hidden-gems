import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/backend/lib/prisma";
import { getEmbedding } from "@/backend/lib/openai";
import { generateMatchBlurb } from "@/backend/lib/groq";
import type { RawPlace, SearchResult, Source } from "@/shared/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, neighborhood } = body as { query?: string; neighborhood?: string };

    if (!query?.trim()) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const trimmedQuery = query.trim();
    const trimmedNeighborhood = neighborhood?.trim();

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
        id, name, neighborhood, address, google_maps_url, photo_url,
        editorial_summary, vibe_tags, sources, verified, created_at,
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
          vibe_tags: Array.isArray(place.vibe_tags) ? place.vibe_tags : [],
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

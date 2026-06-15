import { NextResponse } from "next/server";
import { prisma } from "@/backend/lib/prisma";
import type { Source } from "@/shared/types";

export async function GET() {
  try {
    const places = await prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        neighborhood: string;
        address: string;
        google_maps_url: string;
        photo_url: string | null;
        editorial_summary: string;
        vibe_tags: string[];
        sources: Source[];
        verified: boolean;
        created_at: Date;
      }>
    >`
      SELECT id, name, neighborhood, address, google_maps_url, photo_url,
             editorial_summary, vibe_tags, sources, verified, created_at
      FROM places
      ORDER BY created_at DESC
    `;

    return NextResponse.json({ places, count: places.length });
  } catch (error) {
    console.error("[/api/places]", error);
    return NextResponse.json({ error: "Failed to fetch places" }, { status: 500 });
  }
}

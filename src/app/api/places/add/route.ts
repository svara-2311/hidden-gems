import { NextRequest, NextResponse } from "next/server";
import { addPlace, findSimilarPlace, type AddPlaceInput } from "@/lib/places";

// POST /api/places/add — insert a user-submitted cafe (confirmed real place or a
// personal/apartment cafe). Enriches + embeds, tags it community-added.
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<AddPlaceInput>;
    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "A cafe name is required." }, { status: 400 });
    }

    const existing = await findSimilarPlace(name);
    if (existing) {
      return NextResponse.json(
        { error: `"${existing.name}" is already on the list.` },
        { status: 409 }
      );
    }

    const place = await addPlace({
      name,
      neighborhood: body.neighborhood?.trim() || "San Francisco",
      city: body.city ?? null,
      region: body.region,
      address: body.address,
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      website: body.website ?? null,
      opening_hours: body.opening_hours ?? null,
      google_maps_url: body.google_maps_url,
      photo_url: body.photo_url ?? null,
      editorial_summary: body.editorial_summary,
    });

    return NextResponse.json({ place });
  } catch (error) {
    console.error("[/api/places/add]", error);
    return NextResponse.json({ error: "Could not add the cafe." }, { status: 500 });
  }
}

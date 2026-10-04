import { NextRequest, NextResponse } from "next/server";
import { addPlace, findSimilarPlace, type AddPlaceInput } from "@/lib/places";
import { rateLimit, clientIp } from "@/lib/rateLimit";

// POST /api/places/add — insert a user-submitted cafe (confirmed real place or a
// personal/apartment cafe). Enriches + embeds, tags it community-added.
export async function POST(req: NextRequest) {
  try {
    // Each add enriches (gpt-4o-mini) + embeds, and writes a row — keep it tight.
    const rl = rateLimit(`add:${clientIp(req)}`, { capacity: 5, refillPerSec: 0.1 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many submissions — please slow down and try again shortly." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

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
      rating: body.rating ?? null,
      user_rating_count: body.user_rating_count ?? null,
    });

    return NextResponse.json({ place });
  } catch (error) {
    console.error("[/api/places/add]", error);
    return NextResponse.json({ error: "Could not add the cafe." }, { status: 500 });
  }
}

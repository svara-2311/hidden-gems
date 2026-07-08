import { NextRequest, NextResponse } from "next/server";
import { lookupCafeByName } from "@/lib/googlePlaces";
import { findSimilarPlace } from "@/lib/places";

// POST /api/places/lookup — { name } → the best-matching cafe from Google
// Places for the user to confirm before adding. Does not write anything.
export async function POST(req: NextRequest) {
  try {
    const { name } = (await req.json()) as { name?: string };
    const trimmed = name?.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Enter a cafe name." }, { status: 400 });
    }

    const existing = await findSimilarPlace(trimmed);
    if (existing) {
      return NextResponse.json({ found: null, alreadyExists: existing.name });
    }

    const found = await lookupCafeByName(trimmed);
    return NextResponse.json({ found });
  } catch (error) {
    console.error("[/api/places/lookup]", error);
    return NextResponse.json({ error: "Lookup failed." }, { status: 500 });
  }
}

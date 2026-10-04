import { NextRequest, NextResponse } from "next/server";
import { lookupCafeByName } from "@/lib/googlePlaces";
import { findSimilarPlace, NAME_EXISTS_THRESHOLD } from "@/lib/places";

// POST /api/places/lookup — { name } → the best-matching cafe from Google
// Places for the user to confirm before adding. Does not write anything.
export async function POST(req: NextRequest) {
  try {
    const { name } = (await req.json()) as { name?: string };
    const trimmed = name?.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Enter a cafe name." }, { status: 400 });
    }

    // Look up on Google first, then dedupe against the resolved canonical
    // name — not the user's raw typed text. Checking the raw text early used
    // to fuzzy-match unrelated places (e.g. "Mildang cafe" against "Milli
    // Cafe" at 0.5 similarity) and block the real lookup before it even ran.
    const found = await lookupCafeByName(trimmed);
    if (!found) {
      return NextResponse.json({ found: null });
    }

    const existing = await findSimilarPlace(found.name, NAME_EXISTS_THRESHOLD);
    if (existing) {
      return NextResponse.json({ found: null, alreadyExists: existing.name });
    }

    return NextResponse.json({ found });
  } catch (error) {
    console.error("[/api/places/lookup]", error);
    return NextResponse.json({ error: "Lookup failed." }, { status: 500 });
  }
}

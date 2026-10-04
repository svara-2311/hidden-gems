/**
 * googlePlaces.ts — look up a single cafe by name via the Google Places API,
 * used by the "add a cafe" flow to auto-populate details for user confirmation.
 * Search only; it does not write to the database.
 */

const PLACES_API_BASE = "https://places.googleapis.com/v1";
const SF_CENTER = { latitude: 37.7749, longitude: -122.4194 };

const FIELD_MASK = [
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.websiteUri",
  "places.regularOpeningHours",
  "places.googleMapsUri",
  "places.photos",
  "places.editorialSummary",
  "places.addressComponents",
  "places.rating",
  "places.userRatingCount",
].join(",");

interface AddressComponent {
  longText: string;
  types?: string[];
}

interface RawPlace {
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  websiteUri?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  googleMapsUri?: string;
  photos?: Array<{ name: string }>;
  editorialSummary?: { text: string };
  addressComponents?: AddressComponent[];
  rating?: number;
  userRatingCount?: number;
}

export interface FoundCafe {
  name: string;
  address: string;
  neighborhood: string;
  city: string | null;
  region: string;
  latitude: number | null;
  longitude: number | null;
  website: string | null;
  opening_hours: string | null;
  google_maps_url: string;
  photo_url: string | null;
  editorial_summary: string;
  rating: number | null;
  user_rating_count: number | null;
}

function pickComponent(components: AddressComponent[], ...types: string[]): string | null {
  for (const t of types) {
    const match = components.find((c) => c.types?.includes(t));
    if (match) return match.longText;
  }
  return null;
}

async function resolvePhoto(photoName: string, apiKey: string): Promise<string | null> {
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

export async function lookupCafeByName(name: string): Promise<FoundCafe | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_PLACES_API_KEY is not set");

  const res = await fetch(`${PLACES_API_BASE}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: `${name} coffee cafe`,
      maxResultCount: 1,
      locationBias: { circle: { center: SF_CENTER, radius: 50000 } },
    }),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { places?: RawPlace[] };
  const p = data.places?.[0];
  if (!p) return null;

  const components = p.addressComponents ?? [];
  const foundName = p.displayName?.text ?? name;
  const neighborhood =
    pickComponent(components, "neighborhood", "sublocality_level_1") ??
    pickComponent(components, "locality") ??
    "San Francisco";
  const city = pickComponent(components, "locality");
  const photo_url = p.photos?.[0] ? await resolvePhoto(p.photos[0].name, apiKey) : null;

  return {
    name: foundName,
    address: p.formattedAddress ?? "",
    neighborhood,
    city,
    region: city === "San Francisco" ? "SF" : "Bay Area",
    latitude: p.location?.latitude ?? null,
    longitude: p.location?.longitude ?? null,
    website: p.websiteUri ?? null,
    opening_hours: p.regularOpeningHours?.weekdayDescriptions?.join("; ") ?? null,
    google_maps_url:
      p.googleMapsUri ?? `https://maps.google.com/?q=${encodeURIComponent(foundName)}`,
    photo_url,
    editorial_summary:
      p.editorialSummary?.text || `${foundName} is a coffee spot in ${neighborhood}.`,
    rating: p.rating ?? null,
    user_rating_count: p.userRatingCount ?? null,
  };
}

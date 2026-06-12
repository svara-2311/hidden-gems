import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";
import * as dotenv from "dotenv";
import path from "path";

// Load .env.local first, then .env
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Types ──────────────────────────────────────────────────────────────────

interface Source {
  type: "reddit" | "submission" | "llm";
  url: string;
  quote: string;
}

interface PlaceSeed {
  name: string;
  neighborhood: string;
  address: string;
  google_maps_url: string;
  photo_url?: string;
  editorial_summary: string;
  vibe_tags: string[];
  sources: Source[];
}

// ── Seed data ──────────────────────────────────────────────────────────────

const PLACES: PlaceSeed[] = [
  {
    name: "Sightglass Coffee",
    neighborhood: "SoMa",
    address: "270 7th St, San Francisco, CA 94103",
    google_maps_url:
      "https://maps.google.com/?q=Sightglass+Coffee+270+7th+St+San+Francisco",
    editorial_summary:
      "Sightglass occupies a converted warehouse in SoMa with soaring ceilings and industrial light fixtures that cast warm pools of light. The roasting happens right in the building, filling the space with the perpetual smell of fresh coffee and toasted wood. It's the kind of place where you can work for three hours without feeling rushed, surrounded by the low hum of a focused crowd.",
    vibe_tags: [
      "warehouse-aesthetic",
      "specialty-roaster",
      "work-friendly",
      "high-ceilings",
      "industrial-chic",
      "good-espresso",
      "laptop-ok",
    ],
    sources: [
      {
        type: "llm",
        url: "",
        quote:
          "Known for its stunning industrial space in a converted SoMa warehouse with in-house roasting.",
      },
      {
        type: "reddit",
        url: "https://reddit.com/r/sanfrancisco",
        quote:
          "Best place to work for a few hours without getting the side-eye from staff.",
      },
    ],
  },
  {
    name: "Andytown Coffee Roasters",
    neighborhood: "Outer Sunset",
    address: "3655 Lawton St, San Francisco, CA 94122",
    google_maps_url:
      "https://maps.google.com/?q=Andytown+Coffee+Roasters+3655+Lawton+St+San+Francisco",
    editorial_summary:
      "Andytown is a neighborhood institution tucked into the foggy Outer Sunset, beloved for its Snowy Plover — a sparkling water, espresso, and whipped cream drink that's become the area's unofficial signature. The space is small, warm, and perpetually busy with surfers and locals who treat it like a living room. Morning fog rolls in while you wait for your drink, and somehow that's perfect.",
    vibe_tags: [
      "neighborhood-gem",
      "foggy-vibes",
      "surf-culture",
      "small-cozy",
      "snowy-plover",
      "locals-only-feel",
      "morning-ritual",
    ],
    sources: [
      {
        type: "llm",
        url: "",
        quote:
          "Famous for the Snowy Plover and its devoted Outer Sunset neighborhood crowd.",
      },
      {
        type: "reddit",
        url: "https://reddit.com/r/sanfrancisco",
        quote:
          "The Snowy Plover is legitimately one of the best drinks in the city.",
      },
    ],
  },
  {
    name: "Ritual Coffee Roasters",
    neighborhood: "Hayes Valley",
    address: "432b Octavia Blvd, San Francisco, CA 94102",
    google_maps_url:
      "https://maps.google.com/?q=Ritual+Coffee+Roasters+432+Octavia+Blvd+San+Francisco",
    editorial_summary:
      "Ritual in Hayes Valley is clean lines, natural light, and extremely serious coffee. The baristas can explain the farm, processing method, and altitude of every bean on the menu without sounding insufferable about it. It's a bright, airy space with just enough seating to feel curated rather than crowded — a spot that takes its craft seriously but doesn't make you feel like a tourist for ordering a latte.",
    vibe_tags: [
      "specialty-coffee",
      "bright-airy",
      "coffee-nerd",
      "hayes-valley",
      "pour-over",
      "farm-to-cup",
      "clean-aesthetic",
      "natural-light",
    ],
    sources: [
      {
        type: "llm",
        url: "",
        quote:
          "One of SF's pioneering third-wave roasters, known for single-origin and transparent sourcing.",
      },
      {
        type: "reddit",
        url: "https://reddit.com/r/Coffee",
        quote:
          "The Hayes Valley location has the best natural light of any Ritual I've been to.",
      },
    ],
  },
  {
    name: "Linea Caffe",
    neighborhood: "Mission",
    address: "3417 18th St, San Francisco, CA 94110",
    google_maps_url:
      "https://maps.google.com/?q=Linea+Caffe+3417+18th+St+San+Francisco",
    editorial_summary:
      "Linea Caffe is a focused, deliberately minimal espresso bar in the Mission that draws an intensely coffee-literate crowd. The space is quiet by design — just the sound of the grinder, steam wand, and low conversation. They pull one of the best straight espressos in the city, and the restraint of the design is a statement: this is about the coffee, and only the coffee.",
    vibe_tags: [
      "minimal",
      "espresso-focused",
      "quiet",
      "no-laptops",
      "coffee-purist",
      "mission",
      "serious-coffee",
      "low-key",
      "no-music",
    ],
    sources: [
      {
        type: "llm",
        url: "",
        quote:
          "Considered one of the best espresso bars in SF with a strict, minimal approach to coffee.",
      },
      {
        type: "reddit",
        url: "https://reddit.com/r/Coffee",
        quote:
          "If you want the best straight shot in the Mission, Linea is it.",
      },
    ],
  },
  {
    name: "Four Barrel Coffee",
    neighborhood: "Mission",
    address: "375 Valencia St, San Francisco, CA 94103",
    google_maps_url: "https://maps.google.com/?q=375+Valencia+St+San+Francisco",
    editorial_summary:
      "The Valencia Street location operates as an independent coffee space in the former Four Barrel building, retaining the industrial-warm character that made it a Mission fixture. Exposed brick, long communal tables, and large windows frame the street life outside. The space still draws a mix of creatives, regulars, and people who just want good coffee without too much ceremony.",
    vibe_tags: [
      "communal-tables",
      "mission-local",
      "industrial-warm",
      "neighborhood",
      "espresso",
      "street-views",
      "creatives",
      "exposed-brick",
    ],
    sources: [
      {
        type: "llm",
        url: "",
        quote:
          "The Valencia Street location retains its classic Mission coffee bar character under independent operation.",
      },
      {
        type: "reddit",
        url: "https://reddit.com/r/sanfrancisco",
        quote:
          "Still a solid spot on Valencia — the space is great for people-watching through the big windows.",
      },
    ],
  },
  {
    name: "Coffee Mission",
    neighborhood: "Mission",
    address: "3170 Mission St, San Francisco, CA 94110",
    google_maps_url:
      "https://maps.google.com/?q=Coffee+Mission+3170+Mission+St+San+Francisco",
    editorial_summary:
      "Coffee Mission is the kind of no-nonsense neighborhood spot that feels completely disconnected from SF's coffee industry chatter. It's unpretentious, affordable, and staffed by people who actually live on this block. The energy is comfortable and slightly chaotic — regulars know each other by name and the pastry case is genuinely good.",
    vibe_tags: [
      "unpretentious",
      "neighborhood-local",
      "affordable",
      "no-frills",
      "mission",
      "community",
      "regulars",
      "casual",
      "lively",
    ],
    sources: [
      {
        type: "llm",
        url: "",
        quote:
          "A true neighborhood spot on Mission Street, favored by locals for its unpretentious vibe.",
      },
      {
        type: "reddit",
        url: "https://reddit.com/r/sanfrancisco",
        quote: "Refreshingly normal in a city full of $7 lattes.",
      },
    ],
  },
  {
    name: "Equator Coffees",
    neighborhood: "Embarcadero",
    address: "1 Ferry Building, San Francisco, CA 94111",
    google_maps_url:
      "https://maps.google.com/?q=Equator+Coffees+Ferry+Building+San+Francisco",
    editorial_summary:
      "The Ferry Building Equator is perched between the bay and the Saturday farmers market, making it one of the most scenically situated coffee bars in the city. A pour-over with a view of the Bay Bridge and Treasure Island is a legitimate morning pleasure. Weekday mornings are calm and unhurried; weekend market days bring the whole city through.",
    vibe_tags: [
      "bay-views",
      "ferry-building",
      "scenic",
      "farmers-market",
      "morning-light",
      "pour-over",
      "waterfront",
      "weekend-ritual",
      "bright",
    ],
    sources: [
      {
        type: "llm",
        url: "",
        quote:
          "Located inside the historic Ferry Building with direct views of the Bay and Bay Bridge.",
      },
      {
        type: "reddit",
        url: "https://reddit.com/r/sanfrancisco",
        quote: "Best views of any coffee spot in the city, hands down.",
      },
    ],
  },
  {
    name: "Verve Coffee Roasters",
    neighborhood: "SoMa",
    address: "Two Embarcadero Center, San Francisco, CA 94111",
    google_maps_url:
      "https://maps.google.com/?q=Verve+Coffee+Roasters+San+Francisco",
    editorial_summary:
      "Verve brought its Santa Cruz-perfected aesthetic to SoMa — whitewashed walls, sun-bleached wood, and a menu built around beautifully sourced single-origins. It's a lighter, airier counterpoint to the darker industrial coffee bars nearby. The outdoor seating fills up fast on good days, and the pour-overs are among the most carefully made in the neighborhood.",
    vibe_tags: [
      "bright-space",
      "california-aesthetic",
      "single-origin",
      "outdoor-seating",
      "soma",
      "light-roasts",
      "clean-white",
      "airy",
      "santa-cruz-vibe",
    ],
    sources: [
      {
        type: "llm",
        url: "",
        quote:
          "Verve's SF outpost brings the Santa Cruz roaster's signature light, airy aesthetic to SoMa.",
      },
      {
        type: "reddit",
        url: "https://reddit.com/r/Coffee",
        quote:
          "The California vibes are strong here — whitewashed, bright, excellent single origins.",
      },
    ],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

async function getEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    dimensions: 1536,
  });
  return response.data[0].embedding;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Hidden Gems — seed script\n");

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set. Add it to .env.local");
  }

  // Clear existing data
  const [{ count }] = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*)::int AS count FROM places
  `;
  if (Number(count) > 0) {
    console.log(`  ↻  Clearing ${count} existing rows...`);
    await prisma.$executeRaw`TRUNCATE TABLE places`;
  }

  for (const place of PLACES) {
    const textToEmbed = `${place.editorial_summary} Vibe: ${place.vibe_tags.join(", ")}`;

    process.stdout.write(`  ↗  Embedding: ${place.name}...`);
    const embedding = await getEmbedding(textToEmbed);
    const embeddingStr = `[${embedding.join(",")}]`;

    // Format as PostgreSQL text array literal: {"tag1","tag2"}
    const tagsLiteral = `{${place.vibe_tags
      .map((t) => `"${t.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`)
      .join(",")}}`;

    await prisma.$executeRawUnsafe(
      `INSERT INTO places
         (name, neighborhood, address, google_maps_url, photo_url,
          editorial_summary, vibe_tags, vibe_embedding, sources, verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7::text[], $8::vector, $9::jsonb, $10)`,
      place.name,
      place.neighborhood,
      place.address,
      place.google_maps_url,
      place.photo_url ?? null,
      place.editorial_summary,
      tagsLiteral,
      embeddingStr,
      JSON.stringify(place.sources),
      true
    );

    console.log(` ✓  (${place.neighborhood})`);
  }

  console.log(`\n✅ Seeded ${PLACES.length} places successfully.\n`);
}

main()
  .catch((err) => {
    console.error("\n❌ Seed failed:", err.message ?? err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

/**
 * enrich.ts — LLM enrichment of places into the controlled vibe/drink vocab.
 *
 * Uses OpenAI gpt-4o-mini (NOT Groq — Groq is chat-only and free-tier rate
 * limits 429 on bulk runs). Places are batched ~12 per call to keep the total
 * number of requests small for a full 500+ place seed.
 */

import { getOpenAI } from "./openai";
import {
  VIBE_TAGS,
  DRINK_TYPES,
  type VibeTag,
  type DrinkType,
} from "@/taxonomy";

export interface EnrichInput {
  name: string;
  neighborhood: string;
  editorial_summary: string;
  types?: string[];
}

export interface EnrichResult {
  vibe_tags: VibeTag[];
  specialties: DrinkType[];
  // Short "known for" line — a concrete signature item or standout feature.
  famous_for: string;
}

const VIBE_SET = new Set<string>(VIBE_TAGS);
const DRINK_SET = new Set<string>(DRINK_TYPES);

// Generic "known for" filler the SYSTEM_PROMPT explicitly forbids. Kept in sync
// with the examples in that prompt and matched case-insensitively at the start
// of the line, where filler tends to appear ("Great coffee and pastries").
const FORBIDDEN_FAMOUS_FOR: RegExp[] = [
  /^quality coffee\b/i,
  /^great coffee\b/i,
  /^good coffee\b/i,
  /^cozy neighborhood cafe\b/i,
];

// True when a famous_for is the kind of generic filler the prompt bans. Empty
// is not "generic" — it's handled by the defaults elsewhere.
function isGenericFamousFor(s: string): boolean {
  const t = s.trim();
  return t.length > 0 && FORBIDDEN_FAMOUS_FOR.some((re) => re.test(t));
}

const SYSTEM_PROMPT = `You are tagging Bay Area coffee shops for a search/filter app.
For EACH place you are given, choose tags ONLY from these two fixed lists — never invent new values.

VIBE_TAGS (pick 2-4 that best fit the atmosphere/use-case):
${VIBE_TAGS.join(", ")}

DRINK_TYPES (pick 2-5 the place is known for or clearly serves):
${DRINK_TYPES.join(", ")}

Also write KNOWN_FOR: a short, specific "known for" line (max ~8 words). If you
recognize the named place, use what it is genuinely known for (a signature drink,
house roast, pastry, or feature). Otherwise infer a plausible specialty from the
description. HARD RULE: never output generic filler that just restates "coffee" or
the city — e.g. "Quality coffee in San Francisco", "Great coffee", "Cozy
neighborhood cafe" are all forbidden. Always name a concrete drink, item, roast
style, or standout feature. Good: "House-roasted single-origin espresso",
"Cardamom buns & flat whites", "Nitro cold brew on tap", "Vietnamese egg coffee".

Base your choices on the place's description. If the description is generic, infer sensible defaults for a coffee shop (e.g. espresso, latte for drinks). Always return at least 1 of each.

Respond with STRICT JSON of the shape:
{"items":[{"vibe_tags":["..."],"specialties":["..."],"known_for":"..."}, ...]}
The items array MUST be in the same order and same length as the input list.`;

async function callModelOnce(inputs: EnrichInput[]): Promise<EnrichResult[]> {
  const userPayload = inputs
    .map((p, i) => {
      const types = p.types?.length ? ` [types: ${p.types.join(", ")}]` : "";
      return `${i + 1}. ${p.name} — ${p.neighborhood}${types}\n   ${p.editorial_summary}`;
    })
    .join("\n");

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.5,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Tag these ${inputs.length} places:\n\n${userPayload}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content) as { items?: unknown };
  const items = Array.isArray(parsed.items) ? parsed.items : [];

  // The prompt requires items to mirror the input list 1:1. If the model drops
  // or adds an entry, indexing would silently misattribute tags to the wrong
  // place — treat the length mismatch as a parse failure so the retry path
  // (callModelWithRetry) regenerates the whole batch.
  if (items.length !== inputs.length) {
    throw new Error(
      `enrich: model returned ${items.length} items for ${inputs.length} inputs`
    );
  }

  return inputs.map((_, i) => sanitize(items[i]));
}

// One model call, then a single corrective retry if the model ignored the
// "no generic filler" rule for any famous_for. We don't trust the instruction
// alone: re-request the batch once, adopt the better line where the retry
// improved it, and blank any that are still generic (empty renders cleanly and
// is preferable to shipping filler). Other failures propagate to the outer
// retry path (callModelWithRetry).
async function callModel(inputs: EnrichInput[]): Promise<EnrichResult[]> {
  const first = await callModelOnce(inputs);
  if (!first.some((r) => isGenericFamousFor(r.famous_for))) return first;

  const retry = await callModelOnce(inputs);
  return first.map((r, i) => {
    if (!isGenericFamousFor(r.famous_for)) return r;
    const alt = retry[i];
    return isGenericFamousFor(alt.famous_for) ? { ...r, famous_for: "" } : alt;
  });
}

// Keep only values that exist in the controlled vocab; guarantee ≥1 of each.
function sanitize(raw: unknown): EnrichResult {
  const obj = (raw ?? {}) as {
    vibe_tags?: unknown;
    specialties?: unknown;
    known_for?: unknown;
  };
  const vibe_tags = uniq(
    (Array.isArray(obj.vibe_tags) ? obj.vibe_tags : [])
      .map((v) => String(v).toLowerCase().trim())
      .filter((v): v is VibeTag => VIBE_SET.has(v))
  ).slice(0, 4);
  const specialties = uniq(
    (Array.isArray(obj.specialties) ? obj.specialties : [])
      .map((v) => String(v).toLowerCase().trim())
      .filter((v): v is DrinkType => DRINK_SET.has(v))
  ).slice(0, 5);
  const famous_for =
    typeof obj.known_for === "string" ? obj.known_for.trim().slice(0, 80) : "";

  return {
    vibe_tags: vibe_tags.length ? vibe_tags : ["cozy"],
    specialties: specialties.length ? specialties : ["espresso", "latte"],
    famous_for,
  };
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export const ENRICH_BATCH_SIZE = 12;

async function callModelWithRetry(inputs: EnrichInput[]): Promise<EnrichResult[]> {
  const MAX_RETRIES = 3;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await callModel(inputs);
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        console.warn(
          `  ⚠  enrich call failed after ${MAX_RETRIES} tries (${(err as Error).message}); using defaults`
        );
        return inputs.map(() => sanitize(null));
      }
      // Exponential backoff: 1s, 2s, 4s
      await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));
    }
  }
  return inputs.map(() => sanitize(null));
}

/**
 * Enrich any number of places. Internally chunks into ENRICH_BATCH_SIZE-sized
 * LLM calls. On any failure (parse/API) a chunk falls back to safe defaults so
 * a single bad batch never aborts a long seed run.
 */
export async function enrichBatch(inputs: EnrichInput[]): Promise<EnrichResult[]> {
  if (inputs.length === 0) return [];
  const out: EnrichResult[] = [];
  for (let i = 0; i < inputs.length; i += ENRICH_BATCH_SIZE) {
    const chunk = inputs.slice(i, i + ENRICH_BATCH_SIZE);
    out.push(...(await callModelWithRetry(chunk)));
  }
  return out;
}

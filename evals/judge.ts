/**
 * judge.ts — LLM-as-judge for the per-result match blurbs (groq.ts).
 *
 * Generation quality has three failure modes worth catching automatically:
 *   • faithfulness — the blurb asserts facts not supported by the place's
 *     editorial summary / vibe tags (hallucination).
 *   • specificity  — the blurb leans on the exact generic filler its own system
 *     prompt bans ("great ambiance", "cozy atmosphere", "hidden gem").
 *   • positivity   — the blurb reads as a recommendation, not a review: it
 *     should never put down the place or hedge on whether it belongs here.
 *     (Caught a real regression: a loosely-worded "sharp, opinionated" system
 *     prompt once produced "I'd rather drink bitter sludge than pretend this
 *     is a legitimate spot" for a top result.)
 *
 * It generates real blurbs (Groq) for the top results of a sample of cases, then
 * scores each with gpt-4o-mini and reports pass rates. This measures the model,
 * not the retrieval, so it's cheap to run on a small sample.
 *
 *   npm run eval:judge
 *   JUDGE_CASES=8 JUDGE_TOP=3 npm run eval:judge
 *
 * Needs DATABASE_URL + OPENAI_API_KEY + GROQ_API_KEY.
 */
import "./env";
import { readFileSync } from "fs";
import path from "path";
import { retrieveCandidates } from "@/lib/search";
import { rankCandidates } from "@/lib/ranking";
import { generateMatchBlurb } from "@/lib/groq";
import { getOpenAI } from "@/lib/openai";
import { prisma } from "@/lib/prisma";

interface GoldCase {
  id: string;
  query: string;
  areas: string[];
  vibes: string[];
  drinks: string[];
}

function loadDataset(): GoldCase[] {
  const file = path.resolve(process.cwd(), "evals/dataset.jsonl");
  return readFileSync(file, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l) as GoldCase);
}

const JUDGE_SYSTEM = `You grade a one-to-two sentence blurb that explains why a coffee shop matches a user's search. You are given the ONLY facts that were available: the place's editorial summary and its vibe tags. Grade three things:

- "faithful": true if every specific claim in the blurb is supported by (or a fair paraphrase of) the provided summary/tags. false if it invents concrete facts not present (a signature drink, an award, a history, a menu item that isn't there).
- "specific": true if the blurb reads like a real recommendation. false if it relies on empty filler such as "great ambiance", "cozy atmosphere", "hidden gem", "perfect spot", "something for everyone".
- "positive": true if the blurb reads as an enthusiastic recommendation. false if it criticizes the place, calls it a bad or questionable match, says something negative about it, or is backhanded/sarcastic — this is a recommendation surface, never a review.

Respond with STRICT JSON: {"faithful": boolean, "specific": boolean, "positive": boolean, "reason": "<10 words"}.`;

interface Verdict {
  faithful: boolean;
  specific: boolean;
  positive: boolean;
  reason: string;
}

async function judgeBlurb(input: {
  query: string;
  name: string;
  editorial_summary: string;
  vibe_tags: string[];
  blurb: string;
}): Promise<Verdict> {
  const res = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: JUDGE_SYSTEM },
      {
        role: "user",
        content: `User search: "${input.query}"
Place: ${input.name}
Editorial summary: ${input.editorial_summary}
Vibe tags: ${input.vibe_tags.join(", ")}

Blurb to grade: "${input.blurb}"`,
      },
    ],
  });
  const parsed = JSON.parse(res.choices[0]?.message?.content ?? "{}") as Partial<Verdict>;
  return {
    faithful: parsed.faithful === true,
    specific: parsed.specific === true,
    positive: parsed.positive === true,
    reason: typeof parsed.reason === "string" ? parsed.reason : "",
  };
}

async function run() {
  for (const k of ["DATABASE_URL", "OPENAI_API_KEY", "GROQ_API_KEY"]) {
    if (!process.env[k]) {
      console.error(`✗ Missing ${k} (check .env.local).`);
      process.exit(1);
    }
  }

  const nCases = Number(process.env.JUDGE_CASES ?? "6");
  const nTop = Number(process.env.JUDGE_TOP ?? "2");
  const cases = loadDataset()
    .filter((c) => c.query.trim() !== "") // blurbs are only generated for text queries
    .slice(0, nCases);

  console.log(`\n☕  Blurb judge  (${cases.length} cases × top ${nTop})\n`);

  const verdicts: Verdict[] = [];
  for (const c of cases) {
    const { candidates } = await retrieveCandidates({
      query: c.query,
      areas: c.areas,
      vibes: c.vibes,
      drinks: c.drinks,
    });
    const ranked = rankCandidates(candidates, { vibes: c.vibes, drinks: c.drinks }).slice(0, nTop);

    for (const { place, vibe_tags } of ranked) {
      const blurb = await generateMatchBlurb({
        query: c.query,
        name: place.name,
        neighborhood: place.neighborhood,
        editorial_summary: place.editorial_summary,
        vibe_tags,
      });
      const v = await judgeBlurb({
        query: c.query,
        name: place.name,
        editorial_summary: place.editorial_summary,
        vibe_tags,
        blurb,
      });
      verdicts.push(v);
      const pass = v.faithful && v.specific && v.positive;
      const flag = pass ? "✓" : "✗";
      console.log(`  ${flag} ${place.name}`);
      console.log(`      “${blurb.replace(/\s+/g, " ").trim()}”`);
      if (!pass) {
        console.log(
          `      faithful=${v.faithful} specific=${v.specific} positive=${v.positive} — ${v.reason}`
        );
      }
    }
  }

  const n = verdicts.length || 1;
  const faithful = verdicts.filter((v) => v.faithful).length;
  const specific = verdicts.filter((v) => v.specific).length;
  const positive = verdicts.filter((v) => v.positive).length;
  const both = verdicts.filter((v) => v.faithful && v.specific && v.positive).length;

  console.log("\n── Aggregate ──────────────────────────────────────────────");
  console.log(`  Faithful   ${faithful}/${n}  (${((faithful / n) * 100).toFixed(0)}%)`);
  console.log(`  Specific   ${specific}/${n}  (${((specific / n) * 100).toFixed(0)}%)`);
  console.log(`  Positive   ${positive}/${n}  (${((positive / n) * 100).toFixed(0)}%)`);
  console.log(`  All pass   ${both}/${n}  (${((both / n) * 100).toFixed(0)}%)\n`);
}

run()
  .catch((err) => {
    console.error("\n❌ judge failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

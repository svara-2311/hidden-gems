/**
 * harness.ts — retrieval + ranking eval.
 *
 * For each labeled case in dataset.jsonl it reproduces production retrieval
 * (retrieveCandidates) and re-ranking (rankCandidates), then scores the ranked
 * names against the case's expected cafes: Precision@5, Recall@10, MRR,
 * nDCG@10. It also checks two invariants — every case returns ≥1 result
 * ("never empty"), and area broadening fires when a case says it should.
 *
 *   npm run eval           # score the dataset, print per-case + aggregate table
 *   LABEL=1 npm run eval   # print the top-10 result names per case, so you can
 *                          # paste the real ones into each case's "relevant"
 *
 * Needs DATABASE_URL + OPENAI_API_KEY (loaded from .env.local via ./env) and a
 * seeded `places` table.
 */
import "./env";
import { readFileSync } from "fs";
import path from "path";
import { retrieveCandidates } from "@/lib/search";
import { rankCandidates } from "@/lib/ranking";
import { prisma } from "@/lib/prisma";
import { scoreCase, mean, type CaseMetrics } from "./metrics";

interface GoldCase {
  id: string;
  query: string;
  areas: string[];
  vibes: string[];
  drinks: string[];
  relevant: string[];
  note?: string;
}

function loadDataset(): GoldCase[] {
  const file = path.resolve(process.cwd(), "evals/dataset.jsonl");
  return readFileSync(file, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l, i) => {
      try {
        return JSON.parse(l) as GoldCase;
      } catch {
        throw new Error(`dataset.jsonl: invalid JSON on line ${i + 1}`);
      }
    });
}

function pct(n: number): string {
  return (n * 100).toFixed(1).padStart(5) + "%";
}

async function run() {
  if (!process.env.DATABASE_URL || !process.env.OPENAI_API_KEY) {
    console.error("✗ Missing DATABASE_URL or OPENAI_API_KEY (check .env.local).");
    process.exit(1);
  }

  const cases = loadDataset();
  const labelMode = process.env.LABEL === "1";
  console.log(
    `\n☕  Hidden Gems — retrieval eval  (${cases.length} cases${labelMode ? ", LABEL mode" : ""})\n`
  );

  const scored: Array<{ id: string; metrics: CaseMetrics; broadened: boolean; empty: boolean }> = [];

  for (const c of cases) {
    const { candidates, expandedArea } = await retrieveCandidates({
      query: c.query,
      areas: c.areas,
      vibes: c.vibes,
      drinks: c.drinks,
    });
    const ranked = rankCandidates(candidates, { vibes: c.vibes, drinks: c.drinks });
    const names = ranked.map((r) => r.place.name);

    if (labelMode) {
      console.log(`● ${c.id}  ${c.query ? `“${c.query}”` : "(filters only)"}`);
      if (expandedArea) console.log(`  ↳ broadened to ${expandedArea}`);
      names.slice(0, 10).forEach((n, i) => console.log(`   ${String(i + 1).padStart(2)}. ${n}`));
      console.log(`   current labels: [${c.relevant.join(", ")}]\n`);
      continue;
    }

    const metrics = scoreCase(names, c.relevant);
    scored.push({
      id: c.id,
      metrics,
      broadened: expandedArea != null,
      empty: names.length === 0,
    });

    console.log(
      `${c.id.padEnd(28)}  P@5 ${pct(metrics.precisionAt5)}  R@10 ${pct(
        metrics.recallAt10
      )}  MRR ${metrics.reciprocalRank.toFixed(2)}  nDCG@10 ${metrics.ndcgAt10.toFixed(2)}` +
        (metrics.returnedCount === 0 ? "  ⚠ EMPTY" : "")
    );
  }

  if (labelMode) {
    console.log("Paste the correct cafe names into each case's \"relevant\" in dataset.jsonl.\n");
    return;
  }

  const neverEmptyPass = scored.filter((s) => !s.empty).length;
  console.log("\n── Aggregate ──────────────────────────────────────────────");
  console.log(`  Precision@5   ${pct(mean(scored, (s) => s.metrics.precisionAt5))}`);
  console.log(`  Recall@10     ${pct(mean(scored, (s) => s.metrics.recallAt10))}`);
  console.log(`  MRR           ${mean(scored, (s) => s.metrics.reciprocalRank).toFixed(3)}`);
  console.log(`  nDCG@10       ${mean(scored, (s) => s.metrics.ndcgAt10).toFixed(3)}`);
  console.log(
    `  Never-empty   ${neverEmptyPass}/${scored.length} ${
      neverEmptyPass === scored.length ? "✓" : "✗ INVARIANT VIOLATED"
    }`
  );
  console.log(`  Broadened     ${scored.filter((s) => s.broadened).length}/${scored.length} cases`);
  console.log("");
}

run()
  .catch((err) => {
    console.error("\n❌ eval failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

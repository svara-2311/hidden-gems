/**
 * harness.ts — retrieval + ranking eval.
 *
 * For each labeled case in dataset.jsonl it reproduces production retrieval
 * (retrieveCandidates) and re-ranking (rankCandidates), then scores the ranked
 * names against the case's expected cafes: Precision@5, Recall@N, MRR, nDCG@N
 * — where N is ranking.ts's DEFAULT_PAGE_SIZE (how many results a user
 * actually sees), not a fixed 10. It also checks two invariants — every case
 * returns ≥1 result ("never empty"), and area broadening fires when a case
 * says it should.
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
import { rankCandidates, DEFAULT_PAGE_SIZE } from "@/lib/ranking";
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

    const isUnlabeled = c.relevant.filter((r) => r.trim()).length === 0;

    if (isUnlabeled) {
      console.log(`${c.id.padEnd(28)}  ⚠ UNLABELED — run LABEL=1 and fill in "relevant"; skipped from aggregate`);
      continue;
    }

    // Score at DEFAULT_PAGE_SIZE depth (what a user actually sees), not a
    // fixed 10 — "Recall@10" is a lie if only 8 results are ever shown.
    const metrics = scoreCase(names, c.relevant, DEFAULT_PAGE_SIZE);

    scored.push({
      id: c.id,
      metrics,
      broadened: expandedArea != null,
      empty: names.length === 0,
    });

    console.log(
      `${c.id.padEnd(28)}  P@5 ${pct(metrics.precisionAt5)}  R@${DEFAULT_PAGE_SIZE} ${pct(
        metrics.recallAtDepth
      )}  MRR ${metrics.reciprocalRank.toFixed(2)}  nDCG@${DEFAULT_PAGE_SIZE} ${metrics.ndcgAtDepth.toFixed(2)}` +
        (metrics.returnedCount === 0 ? "  ⚠ EMPTY" : "")
    );
  }

  if (labelMode) {
    console.log("Paste the correct cafe names into each case's \"relevant\" in dataset.jsonl.\n");
    return;
  }

  const unlabeledCount = cases.length - scored.length;
  const neverEmptyPass = scored.filter((s) => !s.empty).length;
  console.log("\n── Aggregate ──────────────────────────────────────────────");
  if (unlabeledCount > 0) {
    console.log(`  (${unlabeledCount} unlabeled case(s) excluded from the numbers below)`);
  }
  console.log(`  Precision@5   ${pct(mean(scored, (s) => s.metrics.precisionAt5))}`);
  console.log(`  Recall@${DEFAULT_PAGE_SIZE}      ${pct(mean(scored, (s) => s.metrics.recallAtDepth))}`);
  console.log(`  MRR           ${mean(scored, (s) => s.metrics.reciprocalRank).toFixed(3)}`);
  console.log(`  nDCG@${DEFAULT_PAGE_SIZE}       ${mean(scored, (s) => s.metrics.ndcgAtDepth).toFixed(3)}`);
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

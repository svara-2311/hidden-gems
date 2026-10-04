/**
 * tune-candidates.ts — sweep CANDIDATE_LIMIT (search.ts) to see whether
 * widening the pre-rerank retrieval pool actually improves results.
 *
 * Unlike tune.ts's MATCH_BONUS sweep, this can't retrieve once and reuse the
 * candidate set — a different CANDIDATE_LIMIT means a different SQL LIMIT, so
 * each value needs its own retrieveCandidates() call (one embedding + one DB
 * query per case per value). More expensive, but it's the only way to
 * actually answer "does a bigger haystack help."
 *
 *   npm run eval:tune-candidates
 *   LIMITS=15,30,50,75,100 npm run eval:tune-candidates   # custom grid
 */
import "./env";
import { readFileSync } from "fs";
import path from "path";
import { retrieveCandidates } from "@/lib/search";
import { rankCandidates, DEFAULT_PAGE_SIZE } from "@/lib/ranking";
import { prisma } from "@/lib/prisma";
import { scoreCase, mean } from "./metrics";

interface GoldCase {
  id: string;
  query: string;
  areas: string[];
  vibes: string[];
  drinks: string[];
  relevant: string[];
}

function loadDataset(): GoldCase[] {
  const file = path.resolve(process.cwd(), "evals/dataset.jsonl");
  return readFileSync(file, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l) as GoldCase)
    .filter((c) => c.relevant.some((r) => r.trim()));
}

const LIMITS = (process.env.LIMITS ?? "15,30,50,75,100")
  .split(",")
  .map((n) => Number(n.trim()))
  .filter((n) => !Number.isNaN(n) && n > 0);

async function run() {
  if (!process.env.DATABASE_URL || !process.env.OPENAI_API_KEY) {
    console.error("✗ Missing DATABASE_URL or OPENAI_API_KEY (check .env.local).");
    process.exit(1);
  }

  const cases = loadDataset();
  console.log(`\n☕  CANDIDATE_LIMIT sweep  (${cases.length} labeled cases × ${LIMITS.length} values)\n`);
  console.log("  Each value re-embeds + re-queries every case — this is slower than eval:tune.\n");

  const rows: Array<{ limit: number; ndcg: number; p5: number; recall: number }> = [];

  for (const limit of LIMITS) {
    const perCase = [];
    for (const c of cases) {
      const { candidates } = await retrieveCandidates(
        { query: c.query, areas: c.areas, vibes: c.vibes, drinks: c.drinks },
        { candidateLimit: limit }
      );
      const ranked = rankCandidates(candidates, { vibes: c.vibes, drinks: c.drinks });
      perCase.push(scoreCase(ranked.map((r) => r.place.name), c.relevant, DEFAULT_PAGE_SIZE));
      process.stdout.write(".");
    }
    rows.push({
      limit,
      ndcg: mean(perCase, (m) => m.ndcgAtDepth),
      p5: mean(perCase, (m) => m.precisionAt5),
      recall: mean(perCase, (m) => m.recallAtDepth),
    });
  }
  console.log("\n");

  const best = rows.reduce((a, b) => (b.ndcg > a.ndcg ? b : a));

  console.log(`  limit   nDCG@${DEFAULT_PAGE_SIZE}   P@5      R@${DEFAULT_PAGE_SIZE}`);
  console.log("  ─────   ───────   ──────   ──────");
  for (const r of rows) {
    const marker = r.limit === best.limit ? "  ← best nDCG" : "";
    console.log(
      `  ${String(r.limit).padStart(5)}   ${r.ndcg.toFixed(3)}     ${(r.p5 * 100).toFixed(1)}%    ${(
        r.recall * 100
      ).toFixed(1)}%${marker}`
    );
  }
  console.log(
    `\n  Current CANDIDATE_LIMIT is 30. Sweep says ${best.limit} maximizes nDCG@${DEFAULT_PAGE_SIZE} on this set.`
  );
  console.log("  (Small sets are noisy — grow dataset.jsonl before trusting a change.)\n");
}

run()
  .catch((err) => {
    console.error("\n❌ tune-candidates failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

/**
 * tune.ts — sweep MATCH_BONUS to turn a magic number into a tuned one.
 *
 * The bonus (ranking.ts) controls how hard an exact vibe/drink match outranks a
 * purely semantic one. This retrieves each case's candidates ONCE (the only
 * network/DB cost), then re-ranks that fixed candidate set at every bonus value
 * — so the comparison is apples-to-apples and cheap. It reports mean nDCG@10 and
 * Precision@5 per bonus and flags the winner.
 *
 *   npm run eval:tune
 *   BONUSES=0,0.02,0.04,0.08,0.15 npm run eval:tune   # custom grid
 */
import "./env";
import { readFileSync } from "fs";
import path from "path";
import { retrieveCandidates } from "@/lib/search";
import { rankCandidates, DEFAULT_MATCH_BONUS, DEFAULT_PAGE_SIZE } from "@/lib/ranking";
import { prisma } from "@/lib/prisma";
import { scoreCase, mean } from "./metrics";
import type { RawPlace } from "@/types";

interface GoldCase {
  id: string;
  query: string;
  areas: string[];
  vibes: string[];
  drinks: string[];
  relevant: string[];
}

// Draft cases with relevant: [] aren't labeled yet — scoring them would just
// add noise (everything looks like 0 recall), same skip harness.ts does.
function loadDataset(): GoldCase[] {
  const file = path.resolve(process.cwd(), "evals/dataset.jsonl");
  return readFileSync(file, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l) as GoldCase)
    .filter((c) => c.relevant.some((r) => r.trim()));
}

const BONUSES = (process.env.BONUSES ?? "0,0.02,0.04,0.08,0.12")
  .split(",")
  .map((b) => Number(b.trim()))
  .filter((b) => !Number.isNaN(b));

async function run() {
  if (!process.env.DATABASE_URL || !process.env.OPENAI_API_KEY) {
    console.error("✗ Missing DATABASE_URL or OPENAI_API_KEY (check .env.local).");
    process.exit(1);
  }

  const cases = loadDataset();
  console.log(`\n☕  MATCH_BONUS sweep  (${cases.length} cases × ${BONUSES.length} values)\n`);

  // Retrieve every case's candidate set once; re-ranking is free after this.
  const retrieved: Array<{ c: GoldCase; candidates: RawPlace[] }> = [];
  for (const c of cases) {
    const { candidates } = await retrieveCandidates({
      query: c.query,
      areas: c.areas,
      vibes: c.vibes,
      drinks: c.drinks,
    });
    retrieved.push({ c, candidates });
    process.stdout.write(".");
  }
  console.log("\n");

  const rows = BONUSES.map((bonus) => {
    const perCase = retrieved.map(({ c, candidates }) => {
      const ranked = rankCandidates(candidates, {
        vibes: c.vibes,
        drinks: c.drinks,
        matchBonus: bonus,
      });
      return scoreCase(ranked.map((r) => r.place.name), c.relevant, DEFAULT_PAGE_SIZE);
    });
    return {
      bonus,
      ndcg: mean(perCase, (m) => m.ndcgAtDepth),
      p5: mean(perCase, (m) => m.precisionAt5),
    };
  });

  const best = rows.reduce((a, b) => (b.ndcg > a.ndcg ? b : a));

  console.log(`  bonus   nDCG@${DEFAULT_PAGE_SIZE}   P@5`);
  console.log("  ─────   ───────   ──────");
  for (const r of rows) {
    const marker = r.bonus === best.bonus ? "  ← best nDCG" : "";
    console.log(
      `  ${r.bonus.toFixed(2)}    ${r.ndcg.toFixed(3)}    ${(r.p5 * 100).toFixed(1)}%${marker}`
    );
  }
  console.log(
    `\n  Current default is ${DEFAULT_MATCH_BONUS}. Sweep says ${best.bonus} maximizes nDCG@${DEFAULT_PAGE_SIZE} on this set.`
  );
  console.log("  (Small sets are noisy — grow dataset.jsonl before trusting a change.)\n");
}

run()
  .catch((err) => {
    console.error("\n❌ tune failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

/**
 * metrics.ts — pure ranking-quality metrics. No I/O, no imports: safe to unit
 * test and reason about in isolation.
 *
 * Relevance model: binary. A ranked result is "relevant" (flag = true) when its
 * name matches one of a labeled case's expected cafes. Recall is computed
 * against the number of distinct labels, on the assumption that each label names
 * one real place in the DB (see evals/README.md).
 */

/** True when `name` contains any label string, case-insensitively. */
export function nameMatches(name: string, labels: string[]): boolean {
  const n = name.toLowerCase();
  return labels.some((l) => l.trim() !== "" && n.includes(l.toLowerCase().trim()));
}

/** Per-result relevance flags for a ranked list, in rank order. */
export function relevanceFlags(rankedNames: string[], labels: string[]): boolean[] {
  return rankedNames.map((name) => nameMatches(name, labels));
}

/** Precision@k = (relevant results in top-k) / k. */
export function precisionAtK(flags: boolean[], k: number): number {
  if (k <= 0) return 0;
  const topK = flags.slice(0, k);
  const hits = topK.filter(Boolean).length;
  return hits / k;
}

/**
 * Recall@k = (distinct labels found in top-k) / (total labels). Counts a label
 * as found if any top-k result name matches it, so it can't exceed 1.
 */
export function recallAtK(rankedNames: string[], labels: string[], k: number): number {
  const cleaned = labels.map((l) => l.trim()).filter(Boolean);
  if (cleaned.length === 0) return 0;
  const topK = rankedNames.slice(0, k);
  const found = cleaned.filter((l) => topK.some((name) => nameMatches(name, [l])));
  return found.length / cleaned.length;
}

/** Reciprocal rank of the first relevant result (0 if none). MRR is its mean. */
export function reciprocalRank(flags: boolean[]): number {
  const idx = flags.findIndex(Boolean);
  return idx === -1 ? 0 : 1 / (idx + 1);
}

/**
 * nDCG@k with binary gains. DCG = Σ rel_i / log2(i + 1); the ideal ordering puts
 * every relevant item first, so IDCG is computed over min(#relevant, k) ones.
 */
export function ndcgAtK(flags: boolean[], k: number): number {
  const dcg = flags
    .slice(0, k)
    .reduce((sum, rel, i) => sum + (rel ? 1 / Math.log2(i + 2) : 0), 0);

  const idealHits = Math.min(flags.filter(Boolean).length, k);
  let idcg = 0;
  for (let i = 0; i < idealHits; i++) idcg += 1 / Math.log2(i + 2);

  return idcg === 0 ? 0 : dcg / idcg;
}

export interface CaseMetrics {
  precisionAt5: number;
  // Named generically (not recallAt10) because the depth is callers'
  // DEFAULT_PAGE_SIZE, not a fixed 10 — recall/nDCG only mean what their label
  // says if that label matches how many results actually get shown.
  recallAtDepth: number;
  reciprocalRank: number;
  ndcgAtDepth: number;
  returnedCount: number;
}

/**
 * Compute the standard metric bundle for one labeled case's ranked names.
 * `depthK` should be the real number of results shown to users (ranking.ts's
 * DEFAULT_PAGE_SIZE) — recall/nDCG beyond that depth measure something users
 * never see.
 */
export function scoreCase(rankedNames: string[], labels: string[], depthK: number): CaseMetrics {
  const flags = relevanceFlags(rankedNames, labels);
  return {
    precisionAt5: precisionAtK(flags, 5),
    recallAtDepth: recallAtK(rankedNames, labels, depthK),
    reciprocalRank: reciprocalRank(flags),
    ndcgAtDepth: ndcgAtK(flags, depthK),
    returnedCount: rankedNames.length,
  };
}

/** Arithmetic mean of a numeric field across cases (0 for an empty set). */
export function mean<T>(rows: T[], pick: (row: T) => number): number {
  if (rows.length === 0) return 0;
  return rows.reduce((s, r) => s + pick(r), 0) / rows.length;
}

# Evals

Closing the loop on Hidden Gems: this folder measures whether search actually
returns good results, instead of eyeballing it. It reuses the **exact**
production retrieval (`src/lib/search.ts`) and ranking (`src/lib/ranking.ts`), so
what the eval scores is what users get.

## The four layers

| Layer | What it checks | Command |
|---|---|---|
| **Retrieval / ranking** | Do the right cafes come back, in a good order? Precision@5, Recall@8, MRR, nDCG@8 (8 = results shown per search) | `npm run eval` |
| **Parameter tuning** | Is `MATCH_BONUS` (ranking.ts) set to the right value? | `npm run eval:tune` |
| **Generation** | Are the Groq blurbs faithful (no invented facts), specific (no "great ambiance"), and positive (a recommendation, never a put-down)? | `npm run eval:judge` |
| **Invariants** | Every query returns ≥1 result; area broadening fires when sparse | folded into `npm run eval` |

## Prerequisites

- A **seeded** `places` table (`npm run seed`).
- `.env.local` with `DATABASE_URL`, `OPENAI_API_KEY` (retrieval + judge) and
  `GROQ_API_KEY` (judge only). The eval scripts load it via `evals/env.ts`.

## The dataset — `dataset.jsonl`

One JSON object per line:

```json
{"id":"cozy-laptop-mission","query":"cozy spot to work on my laptop",
 "areas":["Mission"],"vibes":[],"drinks":["pour-over"],
 "relevant":["Ritual","Four Barrel"],"note":"..."}
```

- `query` / `areas` / `vibes` / `drinks` — the same shape the UI POSTs to
  `/api/search`. `vibes`/`drinks` must be values from `src/taxonomy.ts`; an empty
  `query` is a valid filter-only case.
- `relevant` — cafes that *should* rank for this case, by **name substring**
  (case-insensitive). Name-based (not UUID) so a human can label from memory. A
  result counts as relevant if its name contains any of these strings.

### Labeling against YOUR database (do this first)

The shipped `relevant` lists were labeled against the maintainers' database, so
**your seed may not contain those exact cafes**. Cases with an empty `relevant`
list (currently 10 of the 24) are unlabeled: they're reported as such and
skipped from the aggregate numbers until you fill them in. Re-label once:

```bash
LABEL=1 npm run eval
```

This prints the top-10 result names for every case. Replace each case's
`relevant` with the names from your DB that genuinely fit the query. Aim for
2–5 per case. This hand-labeling *is* the ground truth — the metrics are only as
honest as it is.

### Growing the set

The best source of realistic queries is production itself: the search route logs
`[search] {query, areas, vibes, drinks, ...}` on every call. Pull representative
lines from your logs, dedupe, and label them here. 40–60 cases spanning moods,
filter-only searches, and sparse areas gives stable numbers; below ~20 the
metrics are too noisy to trust a change.

## Interpreting the output

- **Precision@5** — of the top 5, how many were relevant. The number a user feels.
- **Recall@8** — of the cafes that should have shown up, how many did (the 8 a user sees).
- **MRR** — how high the *first* good result lands (1.0 = always rank 1).
- **nDCG@8** — order-aware overall quality; the headline metric for tuning.
- **Never-empty** — must be N/N. A miss means the broadening logic regressed.

## Tuning `MATCH_BONUS`

`npm run eval:tune` retrieves each case's candidates once, then re-ranks that
fixed set at several bonus values and reports mean nDCG@8 / P@5 per value. Use
it to justify the constant instead of guessing:

```bash
BONUSES=0,0.02,0.04,0.08,0.15 npm run eval:tune
```

If a different value wins clearly *and repeatably on a large enough set*, change
`DEFAULT_MATCH_BONUS` in `src/lib/ranking.ts`.

`npm run eval:tune-candidates` does the same for how many pgvector candidates
get re-ranked (`CANDIDATE_LIMIT`).

## What this is not

- Not a load/latency test (measure p50/p95 separately).
- Not a substitute for enrichment QA — that's an offline data-quality check on
  `vibe_tags`/`specialties`; add it when you have a labeled tag gold set.

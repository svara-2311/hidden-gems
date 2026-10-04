# CLAUDE.md

Guidance for Claude Code (and humans) working in this repo. Read this before making changes.

## What this is

Hidden Gems — a vibe-based coffee shop discovery app for the SF Bay Area. Users
search by mood ("cozy spot for pour-over") or tap preference filters, and get a
ranked list of coffee shops with AI-generated "why it matches" blurbs. Next.js 14
App Router + Postgres/pgvector + Prisma.

## Architecture at a glance

```
Browser (src/app/page.tsx)
   │  POST { query?, areas[], vibes[], drinks[] }
   ▼
src/app/api/search/route.ts
   │  1. embed query+prefs   → src/lib/openai.ts   (OpenAI text-embedding-3-small)
   │  2. pgvector rank + area filter  → src/lib/prisma.ts
   │  3. per-result blurb    → src/lib/groq.ts     (Groq qwen/qwen3.8-27b)
   ▼
Postgres `places` table (vector(1536))
```

The database is populated offline by `scripts/seed.ts`:
**Google Places → enrich (src/lib/enrich.ts, gpt-4o-mini) → embed → upsert.**

## Conventions & invariants — do not break these

1. **Embeddings = OpenAI. Chat = Groq or gpt-4o-mini. Never Groq for embeddings**
   — Groq has no embeddings endpoint. Bulk enrichment uses OpenAI `gpt-4o-mini`
   (high rate limits); per-request blurbs use Groq (free, cheap). See `src/lib/`.

2. **`src/taxonomy.ts` is the single source of truth** for vibe tags, drink
   types, and area→pattern mappings. Both the seed's LLM enrichment and the UI
   filters import from it. Add a new vibe/drink there, not inline.

3. **Filters rank, they don't exclude.** Vibe/drink preferences are folded into
   the embedded query text and add a small score bonus — they must never become
   hard `WHERE` filters (that reintroduces empty-result dead-ends). **Area** is
   the only hard constraint, and it broadens to its region when too sparse.

4. **One seed.** `scripts/seed.ts` does fetch → enrich → embed → upsert in one
   pass. There is no separate enrich step. `RESET=true npm run seed` rebuilds.

5. **Flat structure.** Helpers in `src/lib/`, components in `src/components/`,
   shared vocab/types at `src/taxonomy.ts` / `src/types.ts`. No `backend/frontend/shared` split.

## Commands

```bash
npm run dev          # dev server (localhost:3000)
npm run build        # production build (run before deploying)
npm run seed         # (re)seed the database — costs API calls
npm run db:push      # sync prisma schema → database
npm run db:studio    # browse the DB
npx tsc --noEmit     # typecheck (there's no configured ESLint)
```

## Gotchas

- **Prisma CLI reads `.env`, not `.env.local`.** Pass vars inline for CLI
  commands: `DATABASE_URL="$(grep '^DATABASE_URL=' .env.local | cut -d= -f2-)" npx prisma db push`.
- **pgvector must be enabled** (`CREATE EXTENSION vector`) before `prisma db push`,
  or the `vibe_embedding vector(1536)` column fails.
- **Supabase:** use the pooler URLs — transaction pooler (`:6543 ?pgbouncer=true`)
  for `DATABASE_URL`, session pooler (`:5432`) for `DIRECT_URL` (migrations). The
  `db.<ref>.supabase.co` direct host is IPv6-only on the free tier. See `DEPLOY.md`.
- **`pg_dump` must be ≥ the server version** when migrating data.
- **Costs:** every search calls OpenAI (embeddings) + Groq (blurbs, free tier);
  seeding calls Google Places + OpenAI. Avoid needless `RESET=true` re-seeds.

## Environment

`OPENAI_API_KEY`, `GROQ_API_KEY`, `GOOGLE_PLACES_API_KEY` (seed only),
`DATABASE_URL`, `DIRECT_URL`. Never commit `.env.local` (gitignored).

## Making changes

- Run `npx tsc --noEmit` after edits; it's the primary correctness gate.
- Keep files focused and under ~200 lines where reasonable.
- When touching search behavior, preserve the "never empty" guarantee.
- Match the surrounding style (comments explain *why*, not *what*).

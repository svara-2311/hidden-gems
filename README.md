# ☕ Hidden Gems

> Vibe-based coffee shop discovery for the SF Bay Area.

Describe the mood you're after — *"quiet corner with good espresso to read on a rainy morning"* — or just tap a few preferences, and get back a ranked list of matching coffee shops, each with an AI-generated note on *why* it fits.

**[🔴 Live demo →](https://hidden-gems-wine.vercel.app/)**

**[→ How it works](#how-it-works)** · **[→ Quick start](#quick-start)** · **[→ Deploy](DEPLOY.md)**

---

## What it does

- **Semantic search** over a growing database of Bay Area coffee shops (800+ and counting, across all 101 incorporated municipalities) using vector embeddings — search by *vibe*, not keywords.
- **Preference filters** (Area / Vibe / Drinks) that *rank* rather than exclude, so you never hit a dead-end "no results" screen.
- **AI match blurbs** — a one-liner per result explaining why it fits your search.
- **Save & share** gems (stored locally), viewable in a slide-out panel — export your collection as an Instagram-story image.
- **Add a cafe** — missing a spot? Enter a name and it's looked up on Google Places, auto-enriched, and added to the shared list (or add a personal/home cafe manually). Community additions are badged.

## How it works

The interesting part is the search pipeline (`POST /api/search`):

1. **Embed** — the query text (plus any selected vibe/drink preferences) is embedded with OpenAI `text-embedding-3-small`.
2. **Rank, don't filter** — pgvector orders every candidate by cosine similarity (`<=>`). Vibe/drink preferences add a small score bonus for matches instead of hard-filtering, so results are always relevant and never empty. **Area** is the one hard constraint, and it gracefully broadens to its wider region if a neighborhood is too sparse.
3. **Explain** — Groq (`qwen/qwen3.8-27b`) writes a one-sentence "why this matches" blurb per result, grounded only in that place's real data (no invented details).

The place database is built offline by `scripts/seed.ts`: **fetch from Google Places → LLM-enrich into a controlled vibe/drink vocabulary (`gpt-4o-mini`) → embed → upsert.**

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL + pgvector (local or Supabase) |
| ORM | Prisma |
| Embeddings + enrichment | OpenAI (`text-embedding-3-small`, `gpt-4o-mini`) |
| Match blurbs | Groq (`qwen/qwen3.8-27b`) |
| Seed data | Google Places API |

## Quick start

```bash
npm install
cp .env.example .env.local          # fill in your keys (see below)

# one-time: enable pgvector, then create the schema
psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS vector;"
npx prisma db push

npm run seed                        # fetch + enrich + embed + insert
npm run dev                         # http://localhost:3000
```

**Environment (`.env.local`):**

```env
OPENAI_API_KEY=...          # embeddings + enrichment
GROQ_API_KEY=...            # match blurbs
GOOGLE_PLACES_API_KEY=...   # seeding only
DATABASE_URL=...            # Postgres (app runtime)
DIRECT_URL=...              # Postgres direct connection (migrations)
```

## Project structure

```
src/
├── app/
│   ├── page.tsx              # Search UI (query + filters + saved panel)
│   ├── layout.tsx            # Root layout + fonts
│   ├── globals.css
│   └── api/search/route.ts   # The search pipeline (embed → rank → blurb)
├── components/
│   ├── SearchBar.tsx         # Query input
│   ├── FilterPanel.tsx       # Area / Vibe / Drinks category filters
│   ├── ResultsGrid.tsx       # Grid + skeleton loading
│   ├── PlaceCard.tsx         # Result card (opens Google Maps)
│   ├── SavedGemsPanel.tsx    # Slide-out saved-gems drawer
│   ├── illustrations.tsx     # SVG placeholders
│   └── ui/badge.tsx
├── lib/
│   ├── prisma.ts             # Prisma client singleton
│   ├── openai.ts             # Embeddings + lazy client
│   ├── enrich.ts             # gpt-4o-mini vibe/drink enrichment
│   ├── groq.ts               # Match-blurb generator
│   ├── savedGems.ts          # localStorage saved-gems + hook
│   └── cn.ts                 # Tailwind class merge
├── taxonomy.ts               # Controlled vibe / drink / area vocabularies
└── types.ts
scripts/seed.ts               # The one seed: fetch → enrich → embed → insert
evals/                        # Retrieval metrics, ranking tuning, LLM-as-judge blurb grading
prisma/schema.prisma          # Place model with vector(1536)
```

## Design decisions

A few deliberate choices worth calling out:

- **Filters rank, they don't exclude.** Hard `AND` filters over sparse tags collapse to zero results fast. Since the vibe/drink signal already lives in the embeddings, we fold preferences into the ranking instead — always relevant, never empty.
- **A controlled vocabulary** (`src/taxonomy.ts`) is the single source of truth shared by the seed's LLM enrichment and the UI filters, so the structured columns stay clean enough to rank on.
- **The right model for each job.** OpenAI for embeddings (Groq has none) and bulk enrichment (`gpt-4o-mini`, high rate limits); Groq for cheap per-request blurbs. Documented in [CLAUDE.md](CLAUDE.md).
- **Evals, not vibes.** Every change to retrieval or ranking runs against a hand-labeled golden set (Precision@k, Recall@k, MRR, nDCG) before shipping, and every blurb-generation prompt change runs through an LLM-as-judge pass (faithful / specific / positive) — see [evals/README.md](evals/README.md).

## Scripts

```bash
npm run dev                  # Start dev server
npm run seed                 # Seed / top up the database
npm run build                # Production build
npm run db:studio            # Browse the DB in Prisma Studio
npm run db:push              # Sync schema to the database
npm run eval                 # Retrieval/ranking metrics against the golden set
npm run eval:tune            # Sweep the ranking formula's match bonus
npm run eval:tune-candidates # Sweep how many candidates get re-ranked
npm run eval:judge           # LLM-as-judge grading of match blurbs
```

## Deployment

See **[DEPLOY.md](DEPLOY.md)** for hosting the database on Supabase (free tier) and sharing it with the team. The app deploys to Vercel — point the same env vars at the hosted database.

---

Built as an AI-prototyping exercise. See **[CLAUDE.md](CLAUDE.md)** for architecture conventions and gotchas.

# Hidden Gems

> Vibe-based coffee shop discovery for the SF Bay Area.

Type *"moody dimly lit spot to read on a rainy morning"* — or just pick a few filters — and get back matching coffee shops with an AI-generated explanation of why each one fits.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL + pgvector |
| ORM | Prisma |
| Seed data | Google Places API |
| Embeddings + enrichment | OpenAI (`text-embedding-3-small`, `gpt-4o-mini`) |
| Match blurbs | Groq (`llama-3.1-8b-instant`) |

---

## Setup

### 1. Install + configure

```bash
npm install
cp .env.example .env.local   # then fill in your keys
```

```env
OPENAI_API_KEY=sk-...
GROQ_API_KEY=gsk_...
GOOGLE_PLACES_API_KEY=...
DATABASE_URL=postgresql://user:password@localhost:5432/hidden_gems
```

### 2. Enable pgvector + sync the schema

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

```bash
npx prisma db push
```

### 3. Seed the database

Fetches Bay Area coffee shops from Google Places, enriches each (vibe tags +
drink specialties), generates embeddings, and inserts them — all in one pass:

```bash
npm run seed                 # add places not already in the DB
RESET=true npm run seed      # truncate + rebuild from scratch
```

### 4. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## How it works

**Search** (`/api/search`) accepts a free-text query and/or `areas`, `vibes`, `drinks` filters:

1. If there's query text, it's embedded with `text-embedding-3-small`.
2. One SQL query applies **hard filters** — area (ILIKE on neighborhood/city), `vibe_tags &&`, `specialties &&` — and orders by pgvector cosine similarity (`<=>`).
3. For each result, Groq writes a 2-sentence "why this matches" blurb (skipped for filter-only searches).

The controlled vibe/drink/area vocabularies live in `src/taxonomy.ts` and are shared by both the seed enrichment and the UI filters.

---

## Project structure

```
src/
├── app/
│   ├── page.tsx              # Search UI (query + filters)
│   ├── map/page.tsx          # Map view of all places
│   ├── layout.tsx            # Root layout + fonts
│   ├── globals.css
│   └── api/
│       ├── search/route.ts   # POST — embed + filter + vector search + blurbs
│       └── places/route.ts   # GET  — all places (for the map)
├── components/
│   ├── SearchBar.tsx         # Query input with example prompts
│   ├── FilterPanel.tsx       # Area / vibe / drink filters + Search button
│   ├── ResultsGrid.tsx       # Grid + skeleton loading state
│   ├── PlaceCard.tsx         # Result card (opens Google Maps)
│   ├── MapComponent.tsx      # OSM iframe map
│   ├── illustrations.tsx     # SVG placeholders
│   └── ui/badge.tsx
├── lib/
│   ├── prisma.ts             # Singleton Prisma client
│   ├── openai.ts             # Embedding helper + lazy client
│   ├── enrich.ts             # gpt-4o-mini vibe/drink enrichment
│   ├── groq.ts               # Match-blurb generator
│   ├── savedGems.ts          # localStorage saved-gems
│   └── cn.ts                 # Tailwind class merge
├── taxonomy.ts               # Vibe / drink / area vocabularies
└── types.ts
prisma/
└── schema.prisma             # Place model with vector(1536)
scripts/
└── seed.ts                   # The one seed: fetch → enrich → embed → insert
```

---

## Useful scripts

```bash
npm run dev          # Start dev server
npm run seed         # Seed / top up the database
npm run build        # Production build
npm run db:studio    # Open Prisma Studio
npm run db:push      # Sync schema to the database
```

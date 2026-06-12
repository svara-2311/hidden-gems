# Hidden Gems

> Vibe-based coffee shop discovery for the SF Bay Area.

Type *"moody dimly lit spot to read on a rainy morning"* and get back 3–6 matching coffee shops with an AI-generated explanation of why each one fits.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Database | PostgreSQL + pgvector |
| ORM | Prisma |
| Embeddings | OpenAI `text-embedding-3-small` (1536-dim) |
| Match blurbs | Anthropic Claude (`claude-sonnet-4-6`) |

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
# Fill in your keys
```

```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://user:password@localhost:5432/hidden_gems
```

### 3. Enable pgvector

Connect to your PostgreSQL database and run:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 4. Run the migration

```bash
npx prisma migrate dev --name init
```

This creates the `places` table with the `vector(1536)` column.

### 5. Seed the database

Generates real OpenAI embeddings and inserts all 8 seed places:

```bash
npm run seed
```

### 6. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## How it works

1. User types a vibe description
2. `/api/search` embeds the query with `text-embedding-3-small`
3. pgvector runs cosine similarity search (`<=>`) against all stored embeddings
4. Top 6 places are returned
5. For each, Claude generates a 2-sentence "why this matches" blurb
6. Results render with staggered fade-in animations

---

## Project structure

```
src/
├── app/
│   ├── page.tsx              # Main search UI (client component)
│   ├── layout.tsx            # Root layout + fonts
│   ├── globals.css
│   └── api/
│       ├── search/route.ts   # POST — embed + vector search + blurbs
│       └── places/route.ts   # GET  — list all places (debug)
├── components/
│   ├── SearchBar.tsx         # Input with example prompts
│   ├── PlaceCard.tsx         # Result card
│   ├── ResultsGrid.tsx       # Grid + skeleton loading state
│   └── ui/
│       ├── badge.tsx
│       └── button.tsx
├── lib/
│   ├── cn.ts                 # Tailwind class merge utility
│   ├── prisma.ts             # Singleton Prisma client
│   ├── openai.ts             # Embedding helper
│   └── anthropic.ts          # Match blurb generator
└── types/
    └── index.ts
prisma/
└── schema.prisma             # Place model with vector(1536)
scripts/
└── seed.ts                   # Generates embeddings + inserts seed data
```

---

## Seed places

| Name | Neighborhood |
|---|---|
| Sightglass Coffee | SoMa |
| Andytown Coffee Roasters | Outer Sunset |
| Ritual Coffee Roasters | Hayes Valley |
| Linea Caffe | Mission |
| Four Barrel Coffee | Mission |
| Coffee Mission | Mission |
| Equator Coffees | Embarcadero |
| Verve Coffee Roasters | SoMa |

---

## Useful scripts

```bash
npm run dev          # Start dev server
npm run seed         # Re-seed the database
npm run db:studio    # Open Prisma Studio
npm run db:migrate   # Run pending migrations
npm run build        # Production build
```

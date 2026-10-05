# Deploying the database to Supabase

How to host the `places` database on Supabase (free tier, no credit card) and
share it with collaborators. The app itself still runs locally (`npm run dev`) — only
the Postgres database moves to the cloud.

> **Why Supabase:** the schema uses `pgvector` (`vibe_embedding vector(1536)`),
> which many free Postgres hosts don't support. Supabase has it built in.

---

## 1. Create the project

1. [supabase.com](https://supabase.com) → sign up (GitHub, no credit card).
2. **New project** → name it, pick a nearby region, **set a strong DB password**
   (you'll need it below).
3. Wait ~2 min to provision.

## 2. Enable pgvector

Dashboard → **Database → Extensions** → search `vector` → toggle **on**.
(Without this, the `vibe_embedding vector(1536)` column can't be created.)

## 3. Get the connection strings

Dashboard → **Connect** → **ORMs → Prisma**. Copy both values into `.env.local`:

```env
# Transaction pooler (:6543) — used by the app at runtime
DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-<n>-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Session pooler (:5432) — used for migrations
DIRECT_URL="postgresql://postgres.<ref>:<password>@aws-<n>-<region>.pooler.supabase.com:5432/postgres"
```

> ⚠️ Use the **pooler** URLs, not `db.<ref>.supabase.co`. The direct host is
> IPv6-only on the free tier and often won't connect. The poolers are IPv4-safe.

The Prisma schema already references both (`prisma/schema.prisma`):

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")   // migrations run through here
  extensions = [vector]
}
```

## 4. Push the schema

The Prisma CLI reads `.env`, **not** `.env.local`, so pass the vars explicitly:

```bash
DATABASE_URL="$(grep '^DATABASE_URL=' .env.local | cut -d= -f2-)" \
DIRECT_URL="$(grep '^DIRECT_URL=' .env.local | cut -d= -f2-)" \
npx prisma db push
```

This creates the `places` table on Supabase.

## 5. Move the data

Copy existing rows straight from local → Supabase (no re-seeding, no API cost):

```bash
DIRECT_URL="$(grep '^DIRECT_URL=' .env.local | cut -d= -f2-)"

pg_dump --data-only --no-owner --no-acl -t public.places \
  "postgresql://<localuser>@localhost:5432/hidden_gems" \
  | psql -v ON_ERROR_STOP=1 "$DIRECT_URL"
```

> ⚠️ `pg_dump` must be **>= your local server version**. If you hit
> `server version mismatch`, use the versioned binary, e.g.
> `/opt/homebrew/opt/postgresql@17/bin/pg_dump`.

Verify:

```bash
psql "$DIRECT_URL" -c \
  "SELECT COUNT(*) total, COUNT(vibe_embedding) with_embedding FROM places;"
# expect: both numbers equal
```

*(Alternative to steps 5 if you'd rather rebuild than copy: `npm run seed` —
but that re-hits Google Places + OpenAI and costs a little.)*

## 6. Run against Supabase

Restart the dev server so it picks up the new `DATABASE_URL`:

```bash
npm run dev
```

---

## Sharing with a collaborator

**Browse the data (no setup):** Supabase → **Organization → Team → Invite** by
email. They get the hosted Table Editor.

**Run the app:**
1. They clone the repo.
2. Send them — **via a secure channel** (password manager / encrypted note, not
   plain Slack/email/git) — a `.env.local` with the same `DATABASE_URL`,
   `DIRECT_URL`, `OPENAI_API_KEY`, `GROQ_API_KEY` (+ `GOOGLE_PLACES_API_KEY` only
   if they'll re-seed).
3. `npm install && npm run dev`.

> **Costs:** the shared DB is free, but search still calls OpenAI (embeddings) +
> Groq per query — billed to whoever's keys are in the running `.env.local`.
> For long-term use, each person should use their own API keys.

---

## Deploying the app to Vercel

The database lives on Supabase (above); the Next.js app deploys to Vercel and
points at it. Vercel auto-detects Next.js — no config file needed. `prisma generate`
runs automatically via the `postinstall` script.

1. **Create an account** — [vercel.com](https://vercel.com) → sign up with GitHub
   (free Hobby plan, no credit card).
2. **Import the repo** — **Add New → Project** → pick `svara-2311/hidden-gems` →
   **Import**. Leave the framework preset (Next.js) and build settings as-is.
3. **Add environment variables** (Project → Settings → Environment Variables) for
   the **Production** environment:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | Supabase **transaction pooler** (`:6543 ?pgbouncer=true`) |
   | `DIRECT_URL` | Supabase **session pooler** (`:5432`) |
   | `OPENAI_API_KEY` | your OpenAI key |
   | `GROQ_API_KEY` | your Groq key |
   | `GOOGLE_PLACES_API_KEY` | your Google Places key |

   > `GOOGLE_PLACES_API_KEY` is required on Vercel because the **"Add a cafe"**
   > flow looks cafes up on Google Places at runtime. (It's also used by the
   > local seed.) Without it, cafe lookup returns "Lookup failed."

4. **Deploy** — click **Deploy**. First build takes ~1–2 min.
5. **Verify** — open the generated `*.vercel.app` URL and run a search.

**Re-deploys are automatic:** every push to `main` triggers a new deployment.
To share, send people the `*.vercel.app` link — no local setup needed.

> **Note on the free Supabase pause:** if the Supabase project has been idle and
> paused, the first request from Vercel will fail until you resume it in the
> Supabase dashboard.

## Gotchas recap

| Symptom | Fix |
|---|---|
| `Environment variable not found: DATABASE_URL` (prisma CLI) | Prisma reads `.env`, not `.env.local` — pass the var inline (step 4). |
| `pg_dump: server version mismatch` | Use a `pg_dump` >= your server version (step 5). |
| Can't connect to `db.<ref>.supabase.co` | Use the pooler URLs instead (step 3). |
| `type "vector" does not exist` on push | Enable the `vector` extension first (step 2). |
| Free project "paused" | Free Supabase projects pause after ~1 week idle — resume from the dashboard. |

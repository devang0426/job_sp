# Feature 01 — Project foundation

**Depends on:** nothing
**Status:** done

## Goal

Dependencies installed, Prisma connected to Neon, a `User` table
migrated, and a health route that proves the database connection works
from a Vercel-shaped runtime.

Nothing visible. This exists so that every later feature can assume the
database is reachable and the toolchain is sound.

## In scope

- Install runtime and dev dependencies.
- `prisma init`, Neon connection, the `User` model only.
- `lib/db.ts` — the Prisma singleton.
- `lib/api.ts` — the response envelope.
- `GET /api/health`.
- `next.config.ts` adjustments needed for later features.

## Out of scope

- Auth. `User` rows are created by hand or seed for now.
- Any other model — the full schema is feature 04.

## Implementation

### Dependencies

```bash
npm i @prisma/client @clerk/nextjs @anthropic-ai/sdk zod \
      pdf-parse lucide-react svix yaml
npm i -D prisma @types/pdf-parse tsx
```

`@trigger.dev/sdk` and `playwright` are installed in features 07 and 13,
where they are first used.

### Prisma and Neon

Two connection strings, and the distinction matters:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // pooled — host contains -pooler
  directUrl = env("DIRECT_URL")     // direct — migrations
}
```

Migrations cannot run through PgBouncer, which is why `directUrl` exists.
Getting this wrong surfaces as connection exhaustion later, at the worst
possible moment. See `../env-reference.md`.

### The Prisma singleton

`lib/db.ts` caches the client on `globalThis` so hot lambdas reuse one
client rather than opening a pool per invocation.

### The response envelope

`lib/api.ts` exports `ok(data)` and `fail(code, message, status)`
producing exactly the two shapes in `../code-standards.md`. Every route
handler from here on uses them — no ad-hoc `NextResponse.json`.

### `next.config.ts`

Add now, so feature 08 does not have to rediscover it:

```ts
serverExternalPackages: ["pdf-parse"],
```

### The health route

`app/api/health/route.ts`, with `runtime = "nodejs"`. Runs
`SELECT 1`, returns `{ ok: true, dbLatencyMs }`.

## Files

- `package.json`
- `next.config.ts`
- `prisma/schema.prisma`
- `lib/db.ts`
- `lib/api.ts`
- `app/api/health/route.ts`
- `.env.local` (not committed; `.gitignore` already covers it)

## Verification

1. `npx prisma migrate dev --name init` applies cleanly against Neon.
2. `npm run dev`, then `GET /api/health` returns `{ data: { ok: true,
   dbLatencyMs: <number> } }`.
3. The `User` table is visible in `npx prisma studio`.
4. `npm run build` passes.

## Notes

- Do not commit `.env.local`. `../env-reference.md` documents the
  variable names; never print the values.
- If Neon's free tier has suspended the compute, the first query takes a
  few seconds to wake it. That is expected, not a bug.

### Implementation notes (what actually happened)

- **Prisma is pinned to v6**, not v7. `npm i prisma` now resolves to
  7.x, whose `prisma.config.ts` datasource model and mandatory
  `prisma-client` generator output diverge from what every context file
  assumes (schema `env()` datasource, `prisma-client-js`, `prisma migrate
  dev`). v6 matches the specs and is battle-tested against Neon + Vercel.
  Revisit only if a later feature needs a v7-only capability.
- **`dotenv-cli` is a dev dependency** (not in the feature's install
  list). The Prisma CLI loads `.env`, but this project keeps its vars in
  `.env.local` per `../env-reference.md`. The `db:migrate` / `db:deploy`
  / `db:studio` scripts wrap Prisma in `dotenv -e .env.local`. Next.js
  itself already reads `.env.local`, so the app runtime needs no wrapper.
- `postinstall` runs `prisma generate` so Vercel builds get a client.
- Run migrations with `npm run db:migrate`, open Studio with
  `npm run db:studio` — not the bare `npx prisma …` in the verification
  list above, which would not see `.env.local`.

## Verification — result

1. Migration `20260902094313_init` applied cleanly against Neon. The
   `User` table and its three unique indexes exist (confirmed via
   `information_schema`).
2. `GET /api/health` returned `{ data: { ok: true, dbLatencyMs: 3855 } }`
   — the high latency was Neon waking from suspend on the first query,
   as predicted above.
3. `User` table queryable through Prisma Client (`user.count()` → 0).
4. `npm run build` passes.

**Blocked for the user until fixed:** `DIRECT_URL` in `.env.local` is
still the `.env.example` placeholder (`user:pass@ep-xxx.region…`).
`DATABASE_URL` (pooled) is real. For Neon the direct URL is the pooled
one with `-pooler` removed from the host. Migration verification above
was run with that derived value; `npm run db:migrate` will fail for the
user until the real `DIRECT_URL` is in place.

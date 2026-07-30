# CLAUDE.md — Live Correctly

## What this is
Live Correctly is a **Human Design practice for solopreneurs** — the individual-facing sibling of Work Correctly (which is for teams). This repo is the marketing site + a lead-magnet flow (free chart) + a personalized email pipeline.

Legal entity: Lauzon Consulting LLC. Brand/DBA: Live Correctly. Contact: shawn@livecorrectly.com · Austin, TX.

## ⚠️ Guardrails — read first
This is a **deliberate rebuild that is simpler than the old app**. The old app was over-engineered; we are not recreating it. Do **not** introduce, and actively push back if asked to add:
- User accounts, login, or auth. The chart flow is **anonymous**.
- Storage of other people's charts, or the ability to browse them.
- A normalized multi-table chart schema (gates/lines/channels/centers as separate tables). See Data model — it's **one table, one JSONB column**.
- Saved/shareable charts or any persistence beyond the single subscriber row.
- Queues, workers, or job systems. Throughput is very low; keep it boring.

Other hard rules:
- **Shawn's written copy is authoritative.** Never silently change wording. Typo fixes are fine; any substantive wording change must be *proposed*, not applied.
- **Reuse the existing chart engine.** Do not rewrite the Human Design calculation. Call the engine already in the repo.
- **Match the existing design** (tokens below + the reference HTML). Do not fall back to generic shadcn/template defaults.

## Development
```bash
pnpm dev          # Start dev server (Turbopack)
pnpm build        # Production build
pnpm lint         # ESLint
pnpm start        # Serve production build locally
```

No test framework is configured. TypeScript strict mode is on; type-check with `npx tsc --noEmit`.

Environment variables — copy `.env.example` to `.env.local` and fill in:
- `DATABASE_URL` — Neon Postgres connection string (required)
- `ADMIN_PASSWORD` — password for `/admin` (required)
- `NEXT_PUBLIC_MAIA_API_KEY` — Maia Mechanics chart API key (optional; falls back to `public/fake-mmi-response.json` when unset)
- `NEXT_PUBLIC_BOOKING_URL` — Google Calendar / Calendly link (checked into `.env`)

## Stack
- **Next.js 16** (React 19) on **Vercel**. Turbopack for dev.
- **Neon** (serverless Postgres) for data. Raw SQL via `@neondatabase/serverless` — no ORM.
- **Resend** + **React Email** for sending. *(Not yet implemented — see "Email pipeline" below.)*
- **Vercel Analytics** (`@vercel/analytics`).
- Analytics: **GA4** via a `track()` wrapper in `chart-form.tsx`. Funnel events: `form_start`, `chart_generated`, `email_optin`. The wrapper is the only place to edit if swapping tools (Plausible/Umami).

## Data model — ONE table
Rename target: `subscribers` (the old name `charts` is misleading — a row is a person who has a chart, not a chart).

```
subscribers
  id            uuid pk
  email         text unique
  first_name    text
  last_name     text null          -- optional; don't gate anything on it
  birth_date    date
  birth_time    time null
  time_unknown  boolean
  birth_place   text
  birth_lat     float null
  birth_lng     float null
  chart         jsonb              -- engine output, VERBATIM. identity fields never go in here.
  seq_position  int default 0      -- email series progress
  next_send_at  timestamptz null
  unsubscribed  boolean default false
  created_at    timestamptz default now()
```

Rules:
- `chart` holds the **entire engine output as-is** — type, authority, profile, definition, centers, channels, gates, planetary activations, all of it nested however the engine nests it. No shredding into columns/tables.
- Person facts (name, email) are **columns**. Chart facts are **JSONB**. Keep that boundary clean — if the engine is re-run, the whole `chart` blob is regenerated wholesale, so nothing else can live inside it.
- Mirror the engine's output shape as a **TypeScript type / Zod schema**, validate on read → typed templates despite opaque JSONB.
- **No denormalization** at this scale (150 rows now, <1000 expected). `where chart->>'type' = 'Projector'` is instant without an index. Only if a specific field ever needs indexing, add a Postgres **generated column** off the JSONB path — never go back to columns+joins.

## Design system
Do not invent new visual style. Use these tokens; the two reference HTML files are the source of truth for layout and feel — **port them into components, don't regenerate from a prompt.**

Colors:
```
--ink:#221B3D  --grape:#6A4BD6  --grape-deep:#4A31A8
--marigold:#FFB020  --coral:#FF6B57
--paper:#F6F3FC  --card:#FFFFFF  --muted:#6E688A  --line:#E6E1F4
```
Fonts:
- **Bricolage Grotesque** — display / headings
- **Hanken Grotesk** — body / UI
- **Newsreader** (serif) — personal/narrative prose (the "Hi, I'm Shawn" bio)

Signature elements (use sparingly, they carry the personality): a slow "breathing" aura orb behind the hero wordmark, and a marigold **highlighter swipe** under one hero word. Aesthetic is **fun but semi-professional** — deliberately not the cream+terracotta AI-default look, and not stock shadcn.

CSS gotcha we already hit twice: don't let a `.wrap` (or similar) `padding` **shorthand** override element vertical padding — a class beats an element selector on specificity and silently zeroes it. Split horizontal/vertical, or raise specificity (`footer.wrap`).

Reference files (place them in the repo, e.g. `/design-reference/`):
- `solopreneur-landing.html`
- `see-your-design.html`

## Pages / structure
- **Landing (`/`)**: hero *"A business designed around you"* → 3 outcome sections under *"What changes for you"* (Decisions / Marketing / Profit) → *"Hi, I'm Shawn"* bio → team hand-off band (*"Working together on a team?"* → workcorrectly.com) → closing CTA → footer.
- **`/see-your-design`**: birth-details form (name, email, date, time, city — with an **"I'm not sure of my exact time"** escape hatch). Email is checked for duplicates before chart generation; duplicate emails are blocked.
- **`/see-your-design/[id]`**: chart display page — renders the bodygraph image and a 10-field readout (Type, Career Design, Strategy, Inner Authority, Decision-making Strategy, Profile, Definition, Assimilation Style, Signature/Not-Self themes).
- **`/admin`**: password-protected subscriber list + `[id]` detail view.

CTA hierarchy: **primary = "See how you're designed"** (free chart, low friction). **Secondary = "Book a conversation."** The free chart leads; booking is the deeper step.

## Chart engine
The chart is generated via the **Maia Mechanics API** (external HTTP call from the client). The `lib/hd-chart/` module is a read-only interpreter that extracts human-readable labels (type, strategy, authority, etc.) from the raw API response — it does **not** calculate anything itself. Do not rewrite it; call it.

When `NEXT_PUBLIC_MAIA_API_KEY` is unset (local dev), the form falls back to `public/fake-mmi-response.json`.

## Copy / voice
- Plain, direct, **outcome-framed**. Not cute, not stylized. Fewer, stronger items beat comprehensive lists.
- Human Design is **named explicitly** here (unlike Work Correctly, where it's unnamed on the front door).
- The three value props are **outcomes, not information** ("Make your own calls with confidence…", not "learn how decisions work").
- Reminder: copy is authoritative — propose changes, don't overwrite.

## Email pipeline (not yet implemented)
Own the pipeline; Kit is being retired in favor of this (it made per-chart personalization hard).
- **List** = Neon. **Send** = Resend. **Templates** = React Email.
- **Personalization is the point**: templates receive `subscriber` + `chart` and render arbitrary mechanics inline — branch on `chart.centers.Sacral.defined`, `chart.channels.includes("34-20")`, pull `chart.planets.personality.sun.gate` into a sentence. Build a small content library (TS objects/functions) keyed by chart facts that your written copy pulls from.
- **Scheduler (decide)**: either a daily **Vercel Cron** hitting `/api/tick` (select `next_send_at <= now()` and not unsubscribed, send, advance position) — which also keeps Neon awake — or **Resend scheduled sends** queued per-subscriber at signup. Low volume; pick one.
- **Compliance (required once you own sending)**: verify the sending domain in Resend (SPF/DKIM/DMARC); a working **unsubscribe** link in every email that sets `unsubscribed = true` (send loop skips those); a **physical postal address** in the footer; a one-line **consent disclosure** under the email field ("I'll send your chart plus a short series on using it. Unsubscribe anytime.").
- Free-tier notes: Resend = 3,000/mo, 100/day, 1 domain (sending individualized API emails is the transactional track, free at this scale — not the contact-based Marketing plan). Neon free = 0.5GB/branch, 6h restore window (thin backups — keep a migration script + occasional `pg_dump`, or upgrade when the data matters).

## Migration
Existing charts (~150) migrate into the one-table model via a one-off Node script (`@neondatabase/serverless`): read old store → map to the schema → drop full chart into `chart` JSONB → upsert. CSV/SQL import works too at this size. Both old and new are Postgres, so nothing exotic. No migration script is checked into this repo; schema is managed manually.

## Key paths
```
app/api/subscribers/route.ts        POST — create subscriber (upsert on email)
app/api/subscribers/check-email/    GET  — email existence check
app/api/subscribers/[id]/route.ts   GET  — fetch subscriber by ID
app/api/admin/                      password-protected admin API
lib/db.ts                           all database queries (raw SQL via Neon)
lib/hd-chart/                       chart interpreter (constants + hdChart())
lib/types/chart.ts                  ChartRecord type (Maia API response shape)
lib/types/subscriber.ts             Subscriber interface
components/chart-form.tsx           birth-details form + chart generation
components/chart-readout.tsx        10-field chart interpretation display
```

## Workflow
- Commit at each working checkpoint so steps can be rolled back.
- Prefer verifiable targets ("form posts to Neon and the row appears") over open-ended "build the app."
- When in doubt, choose the simpler option — this project's whole thesis is that the old version was too complex.

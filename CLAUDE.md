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
- `RESEND_API_KEY` — Resend API key for sending email
- `RESEND_WEBHOOK_SECRET` — Resend webhook signing secret (for bounce/complaint handling)
- `CRON_EMAIL_ENABLED` — set to `true` to enable the automated cron; anything else = cron returns early. Admin manual sends are always live (they bypass this flag). Omit `RESEND_API_KEY` in `.env.local` to prevent any sends during local development.
- `EMAIL_FROM` — sender address (default: `Live Correctly <hello@livecorrectly.com>`)
- `APP_URL` — public URL for unsubscribe links (default: `https://livecorrectly.com`)
- `CRON_SECRET` — Vercel cron authorization secret

## Stack
- **Next.js 16** (React 19) on **Vercel**. Turbopack for dev.
- **Neon** (serverless Postgres) for data. Raw SQL via `@neondatabase/serverless` — no ORM.
- **Resend** + **React Email** for sending.
- **Vercel Analytics** (`@vercel/analytics`).
- Analytics: **GA4** via a `track()` wrapper in `chart-form.tsx`. Funnel events: `form_start`, `chart_generated`, `email_optin`. The wrapper is the only place to edit if swapping tools (Plausible/Umami).

## Data model — ONE table
Rename target: `subscribers` (the old name `charts` is misleading — a row is a person who has a chart, not a chart).

```
subscribers
  id              uuid pk
  email           text unique
  first_name      text
  last_name       text null          -- optional; don't gate anything on it
  birth_date      date
  birth_time      time null
  time_unknown    boolean
  birth_place     text
  birth_lat       float null
  birth_lng       float null
  chart           jsonb              -- engine output, VERBATIM. identity fields never go in here.
  seq_position    int default 0      -- email series progress (0 = no emails sent yet)
  next_send_at    timestamptz null
  email_status    text default 'active'  -- active | unsubscribed | bounced | complained | failed | suppressed
  email_status_at timestamptz null
  unsub_token     uuid default gen_random_uuid()
  created_at      timestamptz default now()
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

## BG5 Functions & Shadows

In BG5 (business-focused Human Design), **functions** are the 9 centers, and **shadows** are the conditioning patterns that appear when a function is undefined/open. The admin UI displays up to 10 functions with their shadow names in priority order:

| # | Function (center) | Shadow (conditioning pattern) |
|---|---|---|
| 1 | **Bringing Traits/Strengths** (conditional) | Near: Blaming yourself for something missing / Far: Blaming others and becoming a victim |
| 2 | **Willpower** (Ego undefined) | Overcompensating |
| 3 | **Emotional Intelligence** (Solar Plexus undefined) | Touchy & nervous |
| 4 | **Identity & Direction** (G Center undefined) | Role confusion |
| 5 | **Survival Instinct** (Spleen undefined) | Unable to let go |
| 6 | **Conceptualization** (Ajna undefined) | Mentally defensive |
| 7 | **Inspiration** (Head undefined) | Losing focus |
| 8 | **Drive & Stamina** (Root undefined) | Too much in a hurry |
| 9 | **Energy Resource** (Sacral undefined) | Over zealous |
| 10 | **Communication & Action** (Throat undefined) | Trying to be the star |

Function/shadow data is in `lib/hd-chart/constants.ts`:
- `functionNames` — ordered array of BG5 function names (the center-based capabilities)
- `shadowNames` — `Record<string, string>` mapping each function name to its shadow name (the conditioning pattern)
- `functionToCenterIndex` — maps function name to chart center array index
- `shadowThemes`, `shadowLessons`, `shadowPressures`, `shadowDescriptions`, `shadowWriteups` — shadow properties keyed by function name

### Bridge Descriptions (Shadow #1)

The **Bringing Traits/Strengths** shadow has unique logic. It's about **bridging gates** — gates the person has where they're missing the harmonic partner to complete a channel. This creates a feeling of incompleteness.

**Critical concept**: `chart.bridges.bridgingGates` is an array of gate numbers the person **DOESN'T have** (wishes they had). These are the missing harmonic partners. The person HAS the other gate in each channel pair.

Example:
- `bridgingGates = [8]` means they're missing gate 8 (Contribution)
- They DO have gate 1 (Creative Self-Expression)
- They can't complete the 1-8 channel (Inspiration)
- Description: "If only you contributed more, you believe you could really inspire. You worry that your natural ability to express yourself creatively isn't enough."

**Implementation**:
- `lib/hd-chart/bridge-descriptions.ts` — all 64 gate descriptions, indexed by the gate they HAVE (not the missing gate)
- `lib/hd-chart/constants.ts` — `gateTraits` mapping (trait, harmonic gate, harmonic trait, strength)
- `lib/hd-chart/index.ts` — `getBridgeDescriptions()` function:
  1. Takes each gate from `bridgingGates` (the missing gate)
  2. Finds its harmonic partner(s) in `gateTraits`
  3. Checks which harmonic the person HAS in their chart
  4. Returns the description indexed by the gate they HAVE
- `app/admin/[id]/page.tsx` — displays bridge details in the Shadows section (only for shadow #1)

**Multi-harmonic gates**: Gates 10, 20, 34, 57 each have 3 possible harmonic partners. The function checks which one the person has and returns the appropriate description from the array.

## Copy / voice
- Plain, direct, **outcome-framed**. Not cute, not stylized. Fewer, stronger items beat comprehensive lists.
- Human Design is **named explicitly** here (unlike Work Correctly, where it's unnamed on the front door).
- The three value props are **outcomes, not information** ("Make your own calls with confidence…", not "learn how decisions work").
- Reminder: copy is authoritative — propose changes, don't overwrite.

## Email pipeline
**List** = Neon. **Send** = Resend. **Templates** = React Email (`emails/` directory).

- **Kill switch**: the automated cron only runs when `CRON_EMAIL_ENABLED=true`. Admin manual sends (from `/admin/[id]`) bypass this flag — they always send if `RESEND_API_KEY` is set. Omit `RESEND_API_KEY` in `.env.local` to prevent any sends during local development.
- **Sole call site**: `emails/send.ts` is the only file that calls `resend.emails.send()`. All emails go through `sendEmail()`, which checks `canSendTo()` (subscriber must be `active`), sets `List-Unsubscribe` / `List-Unsubscribe-Post` headers, and renders the React component to HTML.
- **Welcome series**: 5-day drip (career type → strategy → authority → indicators → conclusion+CTA). Templates are in `emails/welcome[1-5].tsx`. Each receives `firstName`, `chart` (flat `EmailChartData` from `parseChartForEmail()`), and `unsubscribeUrl`.
- **Scheduler**: daily Vercel Cron at 14:00 UTC (`/api/cron/welcome-series`, configured in `vercel.json`). Queries `next_send_at <= now()` where `email_status = 'active'`, sends the next email in the series, advances `seq_position`, sets `next_send_at` to tomorrow.
- **Admin manual send**: `POST /api/admin/subscribers/[id]/send-welcome` with `{ step: 1-5 }`. Sends a specific welcome email without advancing `seq_position` or `next_send_at`. Requires admin auth. Returns 422 if subscriber is not active.
- **Personalization**: templates branch on chart type booleans (`isGenerator`, `isProjector`, etc.) and pull content from maps in `emails/content.ts` (strategy writeups, authority writeups/tips keyed by authority type).
- **Compliance**: `List-Unsubscribe` header + footer link in every email; `GET /api/unsubscribe?token=<uuid>` and `POST` (RFC 8058 one-click); physical address in footer; bounce/complaint webhook at `/api/webhooks/resend` updates `email_status`.
- **Content maps**: `emails/content.ts` holds `strategyWriteups`, `authorityWriteups`, `authorityTips` — ported from the old `WelcomeCampaignText.tsx`. Use `lookupByAuthority()` to handle casing normalization.
- Free-tier notes: Resend = 3,000/mo, 100/day, 1 domain. Neon free = 0.5GB/branch.

## Migration
Existing charts (~150) migrate into the one-table model via a one-off Node script (`@neondatabase/serverless`): read old store → map to the schema → drop full chart into `chart` JSONB → upsert. CSV/SQL import works too at this size. Both old and new are Postgres, so nothing exotic. No migration script is checked into this repo; schema is managed manually.

## Key paths
```
app/api/subscribers/route.ts        POST — create subscriber (upsert on email)
app/api/subscribers/check-email/    GET  — email existence check
app/api/subscribers/[id]/route.ts   GET  — fetch subscriber by ID
app/api/admin/                      password-protected admin API
app/api/admin/subscribers/[id]/send-welcome/  POST — manual welcome email send
app/api/unsubscribe/route.ts        GET/POST — unsubscribe (token-based)
app/api/webhooks/resend/route.ts    POST — Resend bounce/complaint webhook
app/api/cron/welcome-series/route.ts GET — daily cron: send due welcome emails
lib/db.ts                           all database queries (raw SQL via Neon)
emails/send.ts                      sole Resend call site (sendEmail + canSendTo)
emails/welcome.ts                   shared getWelcomeEmail() + WELCOME_SERIES_LENGTH
emails/content.ts                   content maps (strategy/authority writeups)
emails/subjects.ts                  subject line generator per welcome step
lib/hd-chart/                       chart interpreter (constants + hdChart())
lib/hd-chart/constants.ts           lookup tables: types, authorities, shadows, gateTraits
lib/hd-chart/bridge-descriptions.ts bridge gate descriptions (shadow #1)
lib/hd-chart/parse-for-email.ts     flat chart data for email templates
lib/types/chart.ts                  ChartRecord type (Maia API response shape)
lib/types/subscriber.ts             Subscriber interface + EmailStatus type
emails/components/                  shared email layout, signature, Ra quote
emails/welcome[1-5].tsx             welcome series templates
components/chart-form.tsx           birth-details form + chart generation
components/chart-readout.tsx        10-field chart interpretation display
migrations/                         SQL migration files (run manually)
vercel.json                         cron schedule config
```

## Old repo
The old app repo is at `/Users/shawn/Development/github/fractalhumandesign`. Reference it when migrating templates, copy, or logic from the previous system.

## Workflow
- Commit at each working checkpoint so steps can be rolled back.
- Prefer verifiable targets ("form posts to Neon and the row appears") over open-ended "build the app."
- When in doubt, choose the simpler option — this project's whole thesis is that the old version was too complex.

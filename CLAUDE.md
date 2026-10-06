# CLAUDE.md — Live Correctly

## What this is
Live Correctly is a **Human Design practice for solopreneurs** — the individual-facing sibling of Work Correctly (which is for teams). This repo is the marketing site + a lead-magnet flow (free chart) + a personalized email pipeline.

Legal entity: Lauzon Consulting LLC. Brand/DBA: Live Correctly. Contact: shawn@livecorrectly.com · Austin, TX.

## ⚠️ Guardrails — read first
This is a **deliberate rebuild that is simpler than the old app**. The old app was over-engineered; we are not recreating it. Do **not** introduce, and actively push back if asked to add:
- User accounts, login, or auth. The chart flow is **anonymous**.
- Storage of other people's charts, or the ability to browse them.
- Saved/shareable charts or any persistence beyond the single subscriber row.
- Queues, workers, or job systems. Throughput is very low; keep it boring.

Other hard rules:
- **Shawn's written copy is authoritative.** Never silently change wording. Typo fixes are fine; any substantive wording change must be *proposed*, not applied.
- **Reuse the existing chart engine.** Do not rewrite the Human Design calculation. Call the engine already in the repo.
- **Match the existing design** (tokens below + the reference HTML). Do not fall back to generic shadcn/template defaults.
- **Never hard-code a value that has a single source of truth elsewhere.** Read it from the source (config file, constant, database) instead of duplicating it. If a value appears in `vercel.json`, a shared constant, or a config file, reference that source — don't copy the value.

## Neon MCP
When querying the Neon MCP, use these IDs directly — do not call `list_projects`:
- **Project ID**: `polished-math-44499803`
- **Org ID**: `org-bitter-haze-78473064`
- **Database**: `neondb`

The Neon MCP is configured **read-only**. You cannot run migrations or any DDL/DML yourself. Create the migration file, then ask Shawn to run it (via Neon Console SQL Editor or `psql`).

## Development
**Always run `pnpm lint` after `pnpm build`** — both must pass before considering a change complete.

Tests use Vitest (`pnpm test:run`; tests live in `tests/`). TypeScript strict mode is on; type-check with `npx tsc --noEmit`.

Environment variables — copy `.env.example` to `.env.local` and fill in:
- `DATABASE_URL` — Neon Postgres connection string (required)
- `ADMIN_PASSWORD` — password for `/admin` (required)
- `NEXT_PUBLIC_MAIA_API_KEY` — Maia Mechanics chart API key (optional; falls back to `public/fake-mmi-response.json` when unset)
- `NEXT_PUBLIC_BOOKING_URL` — Google Calendar / Calendly link (checked into `.env`)
- `RESEND_API_KEY` — Resend API key for sending email
- `RESEND_WEBHOOK_SECRET` — Resend webhook signing secret (for bounce/complaint handling)
- `CRON_EMAIL_ENABLED` — set to `true` to enable the automated cron; anything else = cron returns early. Admin manual sends are always live (they bypass this flag). Omit `RESEND_API_KEY` in `.env.local` to prevent any sends during local development.
- `EMAIL_FROM` — sender address (default: `Live Correctly <hello@livecorrectly.com>`)
- `APP_URL` — public URL for unsubscribe links (default: `https://www.livecorrectly.com`)
- `CRON_SECRET` — Vercel cron authorization secret
- `NEWSLETTER_TEST_EMAIL` — recipient of newsletter test sends; must be a subscriber with a chart (default: `shawn.lauzon@gmail.com`). Separate from `ADMIN_EMAIL`, which receives admin notifications.

## Stack
- **Neon** (serverless Postgres) for data. Raw SQL via `@neondatabase/serverless` — no ORM.
- Analytics: **GA4** via a shared `track()` wrapper in `lib/analytics.ts`. Funnel events: `form_start`, `chart_generated`, `generate_lead` (key event — fires after subscriber save), `book_consultation_click`. Import `track` from `@/lib/analytics` wherever needed. **Maintain best-in-class GA4 implementation**: Consent Mode v2 (all 4 types declared), events fire only after the action they describe succeeds, no UTM params on internal navigation, every meaningful user action has a named event. When adding new features, add appropriate GA4 events and keep the consent/privacy model intact.

## Data model
Rename target: `subscribers` (the old name `charts` is misleading — a row is a person who has a chart, not a chart).

```
subscribers
  id              uuid pk
  email           text unique
  first_name      text
  last_name       text null          -- optional; don't gate anything on it
  birth_input     jsonb not null       -- { date, time, timeUnknown, city, country }
  chart           jsonb              -- engine output, VERBATIM. identity fields never go in here.
  next_step       int default 0      -- next email to send (0 = welcome0 is next, 4 = welcome done, 4+ = newsletter progression)
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

## Copy / voice
- Plain, direct, **outcome-framed**. Not cute, not stylized. Fewer, stronger items beat comprehensive lists.
- Human Design is **named explicitly** here (unlike Work Correctly, where it's unnamed on the front door).
- The three value props are **outcomes, not information** ("Make your own calls with confidence…", not "learn how decisions work").
- Reminder: copy is authoritative — propose changes, don't overwrite.

## UTM conventions
Follow Google's standard so GA4 auto-groups into the correct default channel:
- `utm_medium=email` — always `email` for any email send
- `utm_source` — the brand sending the email (`livecorrectly` or `workcorrectly`)
- `utm_campaign` — the specific send (e.g., `welcome_series`, `station_austin_followup`)

Use `utm_source=workcorrectly` when linking to livecorrectly.com from Work Correctly emails.

## Email pipeline
**List** = Neon. **Send** = Resend. **Templates** = React Email (`emails/` — templates only; sending/rendering logic lives in `lib/email/` and `lib/newsletter/`).

- **Kill switch**: the automated cron only runs when `CRON_EMAIL_ENABLED=true`. Admin manual sends (from `/admin/[id]`) bypass this flag — they always send if `RESEND_API_KEY` is set. Omit `RESEND_API_KEY` in `.env.local` to prevent any sends during local development.
- **Sole call site**: `lib/email/send.ts` is the only file that calls `resend.emails.send()`. All emails go through `sendEmail()`, which checks `canSendTo()` (subscriber must be `active`; `sendTransactionalEmail()` skips this — its caller decides eligibility, and unsubscribed people may still receive an email they explicitly requested), sets `List-Unsubscribe` / `List-Unsubscribe-Post` headers, and renders the React component to HTML.
- **Welcome series**: 3-day drip (career type → signposts → invitation). Templates are in `emails/welcome[1-3].tsx`. Each receives `firstName`, `chart` (flat `EmailChartData` from `parseChartForEmail()`), and `unsubscribeUrl`.
- **Daily cron**: Vercel Cron (`/api/cron/daily-emails`; schedule lives in `vercel.json`). Queries active subscribers with `next_step` between 1 and `WELCOME_SERIES_LENGTH`, sends the email at `next_step`, advances `next_step`. Extensible for future per-subscriber emails (birthday, milestones).
- **Newsletters**: an admin schedules each issue via `POST /api/admin/newsletters/schedule` (other newsletter admin routes live under `app/api/admin/newsletters/`). Cadence is weekly (weekday + time in `newsletters`); "Regular time" comes from `nextRegularSendAt()` (`lib/newsletter/cadence.ts`). The audience is subscribers with `next_step` = the issue, routed by `planAudience()` (`lib/newsletter/audience.ts`): existing persistent segment (stragglers added), multiple segments merged into the oldest (UI confirms first), a new date-named persistent segment, or — under `SEGMENT_MIN_SIZE` with no segment — individual scheduled emails. Completion is decided from Resend's own send status by `finalizeDueSchedules()` (`lib/newsletter/finalize.ts`), run when the admin newsletter list loads and by the daily cron: it atomically marks the schedule `sent` and sets the segment's `next_issue` to the following issue. Never infer completion from per-recipient `email.sent` webhooks — skipped recipients (unsubscribed/suppressed) never send one.
- **Reordering issues**: unsent issues (no sends, no schedule rows) can be moved up/down on the Newsletters admin page (`POST /api/admin/newsletters/[number]/move` → `swapNewsletterIssues()`). Numbers are slots: the swap moves content, while `next_step`, segments' `next_issue`, and schedules stay on the number. Blocked if any issue has an engagement conditional (`newsletter_<n>.…`) on either number.
- **Newsletter notes**: dated notes (`newsletter_notes`, managed on the Newsletters admin page via `/api/admin/newsletters/notes`) are rendered above the issue body of any newsletter sent on that date in the publication timezone (`lib/newsletter/notes.ts`). The note is baked in at schedule time. Test sends use the next regular send day's note, admin manual sends use today's, and the editor preview shows the earliest note dated today or later. Notes never change the inbox preheader, which is always the issue's `preview`.
- **Newsletter replies**: broadcasts are sent From `shawn@EMAIL_DOMAIN_BROADCAST` (no Reply-To); that domain's MX is Resend inbound. The `email.received` webhook records a `reply` event, then `forwardInboundReply()` (`lib/email/send.ts`) forwards the message (with attachments) to `EMAIL_FROM` so it looks like a direct message: original subject/body, the sender's name as the From display name (address stays on the verified notifications domain), Reply-To = the original sender. Skips mail from `EMAIL_FROM` itself and `Auto-Submitted` mail. Do not set a Reply-To on broadcasts — it would bypass Resend and kill reply tracking.
- **Admin manual send**: `POST /api/admin/subscribers/[id]/send-welcome` with `{ step: 1-3 }`. Sends a specific welcome email without advancing `next_step`. Requires admin auth. Returns 422 if subscriber is not active.
- **Personalization**: templates branch on chart type booleans (`isGenerator`, `isProjector`, etc.) and pull content from maps in `emails/content.tsx` (strategy writeups, authority writeups/tips keyed by authority type).
- **Compliance**: `List-Unsubscribe` header + footer link in every marketing email (welcome series, newsletters). Transactional emails a subscriber requests (`sendTransactionalEmail()`, e.g. the chart-link email) carry neither and are sent From `EMAIL_FROM`; requesting one never re-subscribes anyone. Resubscribing happens only on the person's own click of the web "Resubscribe" prompt (`lib/email/resubscribe.ts`, recorded as a `resubscribe` event) — never ask unsubscribed people to resubscribe by email (in the UK/EU that request is itself marketing); `GET /api/unsubscribe?token=<uuid>` and `POST` (RFC 8058 one-click); physical address in footer; bounce/complaint webhook at `/api/webhooks/resend` updates `email_status`.
- **Content maps**: `emails/content.tsx` holds `strategyWriteups`, `authorityWriteups`, `authorityTips` — ported from the old `WelcomeCampaignText.tsx`. Use `lookupByAuthority()` to handle casing normalization.
- Free-tier notes: Resend = 3,000/mo, 100/day, 1 domain. Neon free = 0.5GB/branch.

## Old repo
The old app repo is at `/Users/shawn/Development/github/fractalhumandesign`. Reference it when migrating templates, copy, or logic from the previous system.

## Workflow
- **Never commit until Shawn explicitly says to.** At a working checkpoint, say it's ready and propose a commit message, then wait.
- Prefer verifiable targets ("form posts to Neon and the row appears") over open-ended "build the app."
- When in doubt, choose the simpler option — this project's whole thesis is that the old version was too complex.

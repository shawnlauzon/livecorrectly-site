# Live Correctly

Marketing site, free chart flow, and personalized email pipeline for [Live Correctly](https://livecorrectly.com) — a Human Design practice for solopreneurs.

## Setup

```bash
pnpm install
cp .env.example .env.local   # then fill in values
pnpm dev                      # http://localhost:3000
```

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon Postgres connection string |
| `ADMIN_PASSWORD` | Yes | Password for `/admin` |
| `NEXT_PUBLIC_MAIA_API_KEY` | No | Maia Mechanics chart API key (falls back to fake data when unset) |
| `NEXT_PUBLIC_BOOKING_URL` | No | Booking link (checked into `.env`) |
| `RESEND_API_KEY` | No | Resend API key for sending email |
| `RESEND_WEBHOOK_SECRET` | No | Resend webhook signing secret |
| `CRON_EMAIL_ENABLED` | No | Set to `true` to enable the automated cron; admin manual sends bypass this flag |
| `EMAIL_FROM` | No | Sender address (default: `Live Correctly <hello@livecorrectly.com>`) |
| `APP_URL` | No | Public URL for unsubscribe links (default: `https://livecorrectly.com`) |
| `CRON_SECRET` | No | Vercel cron authorization secret |

## Scripts

```bash
pnpm dev        # Dev server (Turbopack)
pnpm build      # Production build
pnpm start      # Serve production build
pnpm lint       # ESLint
npx tsc --noEmit  # Type-check (strict mode)
```

## Database migrations

Schema is managed manually via SQL files in `migrations/`. Run them against your Neon database:

```bash
psql "$DATABASE_URL" -f migrations/001_email_status.sql
```

Or paste the file contents into the Neon dashboard SQL Editor.

## Email system

A 5-day welcome series sent via Resend with React Email templates. The automated cron only runs when `CRON_EMAIL_ENABLED=true`. Admin manual sends (from `/admin/[id]`) bypass this flag.

### How it works

1. Subscriber fills out the chart form and is inserted into the `subscribers` table
2. A daily Vercel cron (`/api/cron/welcome-series`, 14:00 UTC) queries subscribers where `next_send_at <= CURRENT_DATE`
3. For each due subscriber, it renders the welcome email at `next_step` with their personalized chart data and calls Resend
4. After sending, it advances `next_step` and sets `next_send_at` to the next day

### Welcome series

| Email | Subject | Content |
|-------|---------|---------|
| Day 1 | Career Type | Type description, Ra quote, career tip, video |
| Day 2 | Personal Interaction Style | Strategy explanation, waiting section, video |
| Day 3 | Decision-Making Strategy | Inner authority, authority tip, "This is the way" |
| Day 4 | Key Indicators | Not-self theme, signature theme, adjective forms |
| Day 5 | Conclusion | Bumper sticker summary, "fair selection" comic, booking CTA |

### Key files

```
lib/email.ts                     Sole Resend call site (send wrapper)
lib/welcome-email.ts             Shared getWelcomeEmail() + WELCOME_SERIES_LENGTH
lib/email-content.ts             Content maps (strategy/authority writeups)
lib/email-subjects.ts            Subject line generator
lib/hd-chart/parse-for-email.ts  Flat chart data for templates
emails/components/               Shared layout, signature, Ra quote
emails/welcome[1-5].tsx          Welcome series templates
```

### Previewing emails

```bash
npx email dev
```

Opens the React Email dev server with preview props for all 5 templates.

### Compliance

- Every email includes a `List-Unsubscribe` header and footer link (RFC 8058 one-click supported)
- `GET /api/unsubscribe?token=<uuid>` flips `email_status` to `unsubscribed`
- `POST /api/webhooks/resend` handles bounce/complaint events via HMAC-verified webhook
- Physical postal address in the email footer

### Bounce and Failure Handling

Email deliverability is managed via the `subscribers.email_status` field and Resend webhooks:

**Status values:**
- `active` — can receive email
- `unsubscribed` — user opted out
- `bounced` — hard bounce from Resend
- `complained` — spam complaint
- `failed` — delivery failure
- `suppressed` — on Resend's suppression list

**How it works:**

1. **Resend sends webhook** — When emails bounce, fail, or trigger spam complaints, Resend posts to `/api/webhooks/resend`
2. **Signature verification** — Webhook handler validates the `svix-signature` header using HMAC-SHA256 via `crypto.subtle` to prevent spoofing
3. **Status update** — Handler calls `updateEmailStatus()` which sets `email_status` and timestamps the change in `email_status_at`
4. **Send prevention** — All email sends go through `sendEmail()` in `emails/send.ts`, which checks `canSendTo()` before every send. Only `active` subscribers receive emails.
5. **Automatic reactivation** — If someone is removed from Resend's suppression list, they're automatically set back to `active`

**Events handled:**
- `email.bounced` → `bounced`
- `email.complained` → `complained`
- `email.failed` → `failed`
- `email.suppressed` / `suppression.added` → `suppressed`
- `suppression.removed` → `active` (if currently suppressed)

**Key guarantees:**
- Cron only queries `WHERE email_status = 'active'`
- Admin manual sends check `canSendTo()` and return 422 if subscriber is not active
- Once someone bounces, they won't receive any more emails until status is manually changed back to `active`
- No queue needed — direct webhook → database update (throughput is low)

### Deploying email

1. Run `migrations/001_email_status.sql` against your Neon database
2. Set `RESEND_API_KEY` in Vercel environment variables
3. Verify your sending domain in Resend (SPF/DKIM/DMARC)
4. Set `CRON_SECRET` in Vercel and configure it in the project settings
5. Optionally configure `RESEND_WEBHOOK_SECRET` and register the webhook URL in Resend
6. Set `CRON_EMAIL_ENABLED=true` when ready to go live

## Stack

- **Next.js 16** (React 19) on Vercel
- **Neon** (serverless Postgres) — raw SQL via `@neondatabase/serverless`
- **Resend** + **React Email** for email
- **Vercel Analytics**

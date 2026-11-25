# Guided: pay first, then pick a time

## Why
Today Guided is booked through a paid Google Calendar appointment schedule:
people pick a time, then pay. People drop out between the two. Paying first
(and getting to pick a time as the reward) should lose fewer of them, and
Stripe Checkout supports promotion codes, which Google's paid booking doesn't.

## Goals
- Permanent: this is how Guided is booked from now on (built on `main`). Only
  the $47 discount is Black Friday–specific (see below).
- Guided's "Book one conversation" goes to Stripe first; after paying, the buyer
  picks a time on an unpaid Google Calendar schedule.
- Promotion codes work at checkout (turned on in the Stripe Payment Link).
- GA4 records the purchase, as it does for the guide.

## Non-goals
- Other offers (Deep Dive, Year Ahead, …) keep their current booking links.
- No Stripe API keys, webhooks or server-side payment checks.
- No new database tables or columns.

## Anti-goals
- A buyer who has paid but can't find where to pick a time.
- A Guided button that leads nowhere because a setting is missing.

## Approaches
- **A. Stripe Payment Link, then a thank-you page on the site (chosen).**
  Mirrors the guide's flow, which already exists. Small, reuses existing pieces,
  and keeps GA4 purchase tracking.
- B. Same, but the time-picking link is emailed only after a Stripe webhook
  confirms payment. Harder to share the free link, but needs API keys, a webhook
  and an email, and the wait is itself a drop-off point. Too much for the volume.
- C. Stripe redirects straight to the Google schedule. Almost no code, but loses
  the GA4 purchase event and any "here's what happens next" page.

Accepted risk: the unpaid schedule's URL could be shared and used to book
without paying. Fine at this scale.

## Design
- **Offer setting, not a Guided special case.** `Offer` gets two optional
  fields: `buyUrl` (Stripe Payment Link) and `scheduleUrl` (unpaid Google
  schedule). Guided reads them from `NEXT_PUBLIC_BUY_URL_GUIDED` and
  `NEXT_PUBLIC_SCHEDULE_URL_GUIDED`. An offer is pay-first only when **both** are
  set; with either missing it behaves exactly as today (its `bookingUrl`, else
  the free-call fallback). Another offer could later opt in with two env vars.
- **Work with me button.** For a pay-first offer, the button goes to the Stripe
  link (with `client_reference_id=<subscriber id>` for known subscribers, as the
  guide does) and fires GA4 `begin_checkout` with the offer's item and price.
  Label unchanged ("Book one conversation"). The homepage "One conversation
  includes the guide" link still goes to `/work-with-me#guided`, unchanged.
- **Thank-you page: `/work-with-me/thanks?offer=guided&session_id={CHECKOUT_SESSION_ID}`**
  (Shawn sets this as the Payment Link's after-payment redirect). Not indexed.
  Shows a heading, one line of what happens next, and a big "Pick your time"
  button to the offer's `scheduleUrl` (GA4 `schedule_click`). Fires GA4
  `purchase` once per session id (`transaction_id` = session id, value = offer
  price), the same way `GuidePurchase` does. Unknown or non-pay-first `offer` →
  redirect to `/work-with-me`.
- **Copy on the thank-you page is a proposal** for Shawn to approve before
  shipping.

## Black Friday (on the `black-friday` branch only, after merging main)
- Shawn creates a Stripe promotion code that takes Guided from $97 to $47.
- The site's Guided Stripe links add `prefilled_promo_code=<code>` so the
  discount is already applied at checkout; the code lives in `BLACK_FRIDAY`.
- GA4 `purchase` value uses the sale price on that branch.

## What Shawn sets up (outside the code)
1. Stripe: a Payment Link for Guided at $97, promotion codes allowed, after
   payment redirect to the thank-you URL above.
2. Google Calendar: an unpaid copy of the Guided appointment schedule (same
   length and booking questions); its booking-page link is the schedule URL.
3. Vercel: set the two env vars; add them to `.env.example`.
4. Retire the paid Guided schedule once the new flow is live.

## Left to the builder
Thank-you page layout (match `/guide/thanks`), test coverage, and how the
"once per session" guard is shared with the guide's.

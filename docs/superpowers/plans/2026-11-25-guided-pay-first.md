# Guided Pay-First Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Guided is bought through a Stripe Payment Link first; the buyer then picks a time on an unpaid Google Calendar schedule from a thank-you page.

**Architecture:** Two optional `Offer` fields (`buyUrl`, `scheduleUrl`) make an offer pay-first when both are set. Work with me links pay-first offers to Stripe; Stripe redirects to `/work-with-me/thanks?offer=<id>&session_id=…`, which records the GA4 purchase and shows a "Pick your time" button. No Stripe API, webhook, or database change.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, CSS modules, Vitest (+ happy-dom for click tests), GA4 via `track()` in `lib/analytics.ts`.

**Spec:** `docs/superpowers/specs/2026-11-25-guided-pay-first-design.md`

## Global Constraints
- Work on `main` (Tasks 1–3). Task 4 runs on `black-friday` after merging `main`.
- Never commit until Shawn says so; each "Commit" step means *stage and propose the message*, then continue only when told.
- Run `pnpm test:run` before any commit; `pnpm build` then `pnpm lint` must pass at the end; `npx tsc --noEmit` clean.
- Thank-you page copy is a **proposal** for Shawn; use the exact strings in Task 3 and flag them as proposed.
- Use design tokens from `app/globals.css` (`--plum`, `--action`, …); never old aliases.
- Never hard-code the Guided price or URLs: read `findOffer('guided')` / env vars.
- GA4 events fire only after the action they describe: `begin_checkout` on the click to Stripe, `purchase` on landing with a valid session id, `schedule_click` on the scheduling button.

## Review Focus
- Only one of the two Guided env vars set → Guided behaves exactly as today (no Stripe link, no thank-you page). Test in Task 1.
- Thank-you URL with an unknown offer, a non-pay-first offer, or no `offer` → redirect to `/work-with-me`. Test in Task 3.
- Thank-you URL without a valid `session_id` (reload after Stripe strips it, or the literal `{CHECKOUT_SESSION_ID}`) → page still shows the scheduling button, but no `purchase` event. Test in Task 3.
- Page reloaded with the same session id → `purchase` fires once in this browser. Test in Task 3.
- Known subscriber clicking Guided → Stripe link carries `client_reference_id`; new visitor's link is unchanged. Test in Task 1.

---

### Task 1: Pay-first offer settings

**Files:**
- Modify: `lib/offers.ts` (Offer type; Guided entry; new helpers after `findOffer`)
- Modify: `.env.example` (add two vars under `NEXT_PUBLIC_BOOKING_URL_GUIDED=`)
- Test: `tests/offers.test.ts`

**Interfaces:**
- Produces:
  - `Offer.buyUrl?: string` — Stripe Payment Link. `Offer.scheduleUrl?: string` — unpaid Google schedule.
  - Guided: `buyUrl: process.env.NEXT_PUBLIC_BUY_URL_GUIDED`, `scheduleUrl: process.env.NEXT_PUBLIC_SCHEDULE_URL_GUIDED` (keep its `bookingUrl` as the fallback).
  - `isPayFirst(offer: Offer): boolean` — true only when both `buyUrl` and `scheduleUrl` are non-empty.
  - `offerBuyUrl(offer: Offer, subscriberId?: string | null): string | undefined` — undefined unless pay-first; adds `client_reference_id` like `guideBuyUrl` (refactor both onto one private `withClientReference(url, subscriberId)`).
  - In the Offer type's doc comment for `buyUrl`, document the Stripe after-payment redirect: `/work-with-me/thanks?offer=<id>&session_id={CHECKOUT_SESSION_ID}`.

- [ ] **Step 1: Write failing tests** in `tests/offers.test.ts`, new `describe("pay-first offers")`, using `vi.stubEnv` + `vi.resetModules()` + dynamic import as the existing `guideBuyUrl` block does:
  - both vars set → `isPayFirst(findOffer('guided')!)` is `true`; `offerBuyUrl(guided, null)` is `"https://buy.stripe.com/test_guided"`; `offerBuyUrl(guided, "11111111-1111-4111-8111-111111111111")` is `"https://buy.stripe.com/test_guided?client_reference_id=11111111-1111-4111-8111-111111111111"`.
  - only `NEXT_PUBLIC_BUY_URL_GUIDED` set (schedule `""`) → `isPayFirst` false, `offerBuyUrl` undefined.
  - only `NEXT_PUBLIC_SCHEDULE_URL_GUIDED` set → `isPayFirst` false.
  - every other offer (`deep-dive`, `year-ahead`, `next-ten-years`, `partnership`) → `isPayFirst` false.
  - Unstub envs and reset modules in `afterEach` so later describes are unaffected.
- [ ] **Step 2:** `pnpm test:run tests/offers.test.ts` → FAIL (`isPayFirst` not exported).
- [ ] **Step 3:** Implement the Interfaces above in `lib/offers.ts`; update the file header comment to mention pay-first offers; add the two vars to `.env.example`.
- [ ] **Step 4:** `pnpm test:run` → all pass.
- [ ] **Step 5: Commit (propose)** `feat: Pay-first settings for offers (Stripe link + unpaid schedule)`

### Task 2: Work with me sends pay-first offers to Stripe

**Files:**
- Modify: `app/(public)/work-with-me/OfferLink.tsx`
- Modify: `app/(public)/work-with-me/page.tsx` (`OfferItem` gets `subscriberId`)
- Test: `tests/offer-link.test.tsx` (new, `// @vitest-environment happy-dom`)

**Interfaces:**
- Consumes: `isPayFirst`, `offerBuyUrl` from Task 1.
- Produces: `OfferLink` accepts optional `checkout?: { id: string; name: string; price: number }`. When present, click fires `track('begin_checkout', { currency: 'USD', value: price, items: [{ item_id: id, item_name: name, price }], location: 'work_with_me' })` **instead of** `book_offer_click`. Without it, behaviour is unchanged.

- [ ] **Step 1: Write failing tests** (mock `@/lib/analytics` as `starter-offer.test.tsx` does; render with `react-dom/client` `createRoot` inside `act`, click the `<a>`):
  - `checkout` given → `track` called once with `'begin_checkout'` and the object above for `{ id: 'guided', name: 'Guided', price: 97 }`.
  - no `checkout`, not free → `track` called with `'book_offer_click', { location: 'work_with_me', offer: 'guided' }` (pins today's behaviour).
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** Add `checkout` to `OfferLink`. In `page.tsx`, pass `subscriberId` into `OfferItem`; for `isPayFirst(offer)` render the primary button with `href={offerBuyUrl(offer, subscriberId)}` and `checkout={{ id: offer.id, name: offer.name, price: offer.price }}`, label `offer.cta`. Non-pay-first offers render exactly as today. The `offerFreeCall` link condition becomes `offer.offerFreeCall && (offer.bookingUrl || isPayFirst(offer))`.
- [ ] **Step 4:** `pnpm test:run` → all pass.
- [ ] **Step 5: Commit (propose)** `feat: Guided's button goes to Stripe when pay-first is set up`

### Task 3: Thank-you page with "Pick your time"

**Files:**
- Create: `lib/once-per-session.ts`
- Modify: `components/guide-purchase.tsx` (use the helper; behaviour unchanged)
- Create: `components/offer-purchase.tsx` (client; GA4 purchase)
- Create: `app/(public)/work-with-me/thanks/page.tsx`, `page.module.css`
- Reuse `TrackedLink` (`components/tracked-link.tsx`) for the scheduling button, passing `target="_blank"` and `rel="noopener noreferrer"`; no new link component.
- Test: `tests/offer-purchase.test.tsx`, `tests/once-per-session.test.ts`, `tests/work-with-me-thanks.test.tsx`

**Interfaces:**
- Consumes: `findOffer`, `isPayFirst`, `isCheckoutSessionId` (Task 1 / existing).
- Produces:
  - `firstTimeThisSession(key: string): boolean` — `sessionStorage` get/set; returns `true` the first time, `false` after; if storage throws, returns `true` with the existing comment explaining why (GA4 dedupes on `transaction_id`).
  - `<OfferPurchase sessionId offer={{ id, name, price }} />` — on mount, if `firstTimeThisSession(\`offer_purchase_${sessionId}\`)`, `track('purchase', { transaction_id: sessionId, currency: 'USD', value: price, items: [{ item_id: id, item_name: name, price }] })`. Renders null.
  - Page: default export async server component reading `searchParams.offer` and `searchParams.session_id`. `metadata`: title `"Thank you — Live Correctly"`, `robots: { index: false }`. If `offer` isn't a pay-first offer id → `redirect('/work-with-me')`. Renders `SiteNav`, then `OfferPurchase` only when `isCheckoutSessionId(session_id)`, then the copy below, then `SiteFooter`. Layout and styles copy `/guide/thanks` (`.page`, `.h1`, `.lede`); the button uses the global `btn` class.
  - Button: `href={offer.scheduleUrl}`, `target="_blank"`, `rel="noopener noreferrer"`, click fires `track('schedule_click', { offer: offer.id })`.
- **Proposed copy (flag to Shawn):**
  - eyebrow: `Thank you`
  - h1: `Now pick your time.`
  - lede: `Choose a time for our conversation. You’ll get a calendar invite as soon as you book.`
  - button: `Pick your time`
  - note under the button: `If you lose this page before booking, email shawn@livecorrectly.com and I’ll send you the link.`

- [ ] **Step 1: Write failing tests**
  - `once-per-session.test.ts` (happy-dom): first call `true`, second call same key `false`, different key `true`.
  - `offer-purchase.test.tsx` (happy-dom, analytics mocked): mounting twice with the same session id calls `track('purchase', …)` exactly once with `{ transaction_id: 'cs_test_abc', currency: 'USD', value: 97, items: [{ item_id: 'guided', item_name: 'Guided', price: 97 }] }`.
  - `work-with-me-thanks.test.tsx`: mock `next/navigation` `redirect` (throw a sentinel), mock `@/components/site-nav` and `@/components/site-footer` to null components, stub both Guided env vars + `vi.resetModules()`, then `renderToStaticMarkup(await Page({ searchParams: Promise.resolve({...}) }))`:
    - `{ offer: 'guided', session_id: 'cs_test_abc' }` → html contains `Now pick your time.`, an `<a` with `href="https://calendar.app.google/test"` and `target="_blank"`.
    - `{ offer: 'guided' }` (no session) → still contains the button; `OfferPurchase` not rendered (assert by mocking `@/components/offer-purchase` to render `<i data-purchase>` and checking absence).
    - `{ offer: 'guided', session_id: '{CHECKOUT_SESSION_ID}' }` → no purchase marker.
    - `{ offer: 'deep-dive' }`, `{ offer: 'nope' }`, `{}` → `redirect` called with `'/work-with-me'`.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** Implement the helper, refactor `GuidePurchase` onto it (its own tests in `tests/guide-purchase.test.ts` must stay green), then `OfferPurchase`, the page, and the button.
- [ ] **Step 4:** `pnpm test:run` → all pass; `npx tsc --noEmit` clean.
- [ ] **Step 5:** `pnpm build` then `pnpm lint` → both pass. Start `pnpm dev` with both Guided env vars set in `.env.local` to test values, load `/work-with-me` (Guided button points at the Stripe URL) and `/work-with-me/thanks?offer=guided&session_id=cs_test_abc` (page renders, button opens the schedule).
- [ ] **Step 6: Commit (propose)** `feat: Guided thank-you page where buyers pick their time`

### Task 4: Black Friday — merge into `black-friday` and prefill the code

Runs only after Shawn approves Tasks 1–3 on `main` and supplies the promotion code name.

**Files:**
- Modify (on `black-friday`): `lib/offers.ts` (`BLACK_FRIDAY.promoCode`), `app/(public)/work-with-me/page.tsx`, `app/(public)/work-with-me/thanks/page.tsx`
- Test: `tests/offers.test.ts`

**Interfaces:**
- `BLACK_FRIDAY.promoCode: string` — the code Shawn created in Stripe.
- `offerBuyUrl` adds `prefilled_promo_code=<promoCode>` when `offer.id === BLACK_FRIDAY.offerId` (alongside any `client_reference_id`).
- `begin_checkout` and `purchase` `value`/`price` use `BLACK_FRIDAY.price` for the sale offer.

- [ ] **Step 1:** `git checkout black-friday && git merge main`; resolve conflicts in `lib/offers.ts`, `app/(public)/work-with-me/page.tsx` (keep both the sale price display and pay-first button).
- [ ] **Step 2: Failing test:** with both Guided vars stubbed, `offerBuyUrl(guided, null)` equals `"https://buy.stripe.com/test_guided?prefilled_promo_code=<promoCode>"`; with a subscriber id it contains both params.
- [ ] **Step 3:** Implement; pass the sale price into `checkout` and `OfferPurchase`.
- [ ] **Step 4:** `pnpm test:run`, `npx tsc --noEmit`, `pnpm build`, `pnpm lint` → all pass.
- [ ] **Step 5: Commit (propose)** `feat: Prefill the Black Friday code on Guided's Stripe link`

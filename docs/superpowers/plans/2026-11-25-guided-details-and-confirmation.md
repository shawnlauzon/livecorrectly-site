# Guided Birth Details + Confirmation Email Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On `/work-with-me/thanks`, new buyers give birth details before booking, and every buyer gets one confirmation email with the scheduling link.

**Architecture:** The guide's existing purchase flow (ChartForm purchase mode → `/api/subscribers` or `/api/guide/purchase` → `confirmGuidePurchase` → transactional email + admin notice) becomes product-aware: "the guide" (default, unchanged) or a pay-first offer id. One shared client component reports purchases on both thank-you pages.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, React Email, Resend via `lib/email/send.ts`, Neon (no schema change), Vitest (+ happy-dom).

**Spec:** `docs/superpowers/specs/2026-11-25-guided-details-and-confirmation-design.md`

## Global Constraints
- Branch `main`. **No commits or staging by implementers** (Shawn's rule); the controller stages after review.
- All buyer-facing copy is exactly the spec's approved strings (spec sections "Confirmation email" and "Thank-you page copy"). The guide's existing copy (on `/guide/thanks`, in `ChartForm` guide mode, in `GuideConfirmation`) must not change.
- "Absent product = the guide": every existing guide call path keeps working with no new field.
- Transactional email rules: only `sendTransactionalEmail()` in `lib/email/send.ts` sends; no unsubscribe/footer; deliverable statuses `active | failed | unsubscribed`; Georgia/Helvetica from `lib/email/fonts.ts`, colors from `lib/email/colors.ts`.
- Never hard-code the scheduling URL, offer name or price: read them from `findOffer(id)`.
- GA4: events fire after the action; keep CLAUDE.md's event list current.
- `pnpm test:run`, `npx tsc --noEmit`, `pnpm build` then `pnpm lint` pass with pristine output. (`pnpm build` has a known intermittent "next/font/google queries have exactly one entry" failure; rerun once on exactly that.)

## Review Focus
- New buyer submits the form → the next page load (with `s=`) must not send a second email or admin notice. Test in Task 1 (server dedupe) and Task 3 (browser once-key shared).
- Unknown or non-pay-first `offer_id` sent to either API → no crash, no email; `/api/guide/purchase` answers 400; `/api/subscribers` still creates the subscriber and logs. Test in Task 2.
- Unsubscribed known subscriber buys → still gets the confirmation email. Test in Task 1.
- Existing guide flow (no product field) → identical emails, subjects, admin notice as today. Tests in Tasks 1–2 pin this.
- Email already on file in the form for an offer → reported with `offer_id`, scheduling button shown in place, no redirect. Test in Task 3 via the pure helpers.

---

### Task 1: Product-aware purchase confirmation (server)

**Files:**
- Rename: `lib/email/guide-purchase.ts` → `lib/email/purchase.ts` (update all imports)
- Create: `emails/conversation-confirmation.tsx`
- Modify: `lib/email/send.ts` (`sendAdminNotification` purchase param)
- Test: rename `tests/guide-purchase.test.ts` → `tests/purchase.test.ts` and extend

**Interfaces:**
- Produces:
  - `confirmPurchase({ subscriber, sessionId, notifyAdmin, offerId? }: { subscriber: Subscriber; sessionId: string; notifyAdmin: boolean; offerId?: string }): Promise<PurchaseResult>`; `PurchaseResult = 'sent' | 'already_confirmed' | 'not_deliverable' | 'failed' | 'unknown_offer'`. No `offerId` → exactly today's guide behaviour (email type `guide_confirmation`, `GuideConfirmation`). With `offerId`: `findOffer(offerId)` must be pay-first (`isPayFirst`) else return `'unknown_offer'` and `console.error`; email type `` `${offerId}_confirmation` ``; template `ConversationConfirmation` with `scheduleUrl = offer.scheduleUrl`. Same 24h dedupe, deliverable statuses, and "admin notice failure doesn't stop the buyer email" as today.
  - `GUIDE_CONFIRMATION_EMAIL_TYPE` stays exported with the same value.
  - `sendAdminNotification(subscriber, chartType, isRestart?, purchase?: { sessionId: string | null; existingSubscriber?: boolean; offerName?: string })`. Without `offerName`: today's subject `Guide purchase: …` and line `Bought the personalized guide. Stripe checkout session: …`. With it: subject `` `${offerName} purchase: ${first_name} (${chartType})` `` and line `` `Bought ${offerName}. Stripe checkout session: …` `` (same "none in the link" fallback).
  - `emails/conversation-confirmation.tsx`: `export const subject`, `export const preview`, `ConversationConfirmation({ firstName, scheduleUrl })`, `PreviewProps`, default export. Body copy exactly per spec; the "Pick your time" is a link/button to `scheduleUrl`. Structure mirrors `emails/guide-confirmation.tsx`.

- [ ] **Step 1: Failing tests** in `tests/purchase.test.ts` (keep every existing guide test, renamed to `confirmPurchase`), add:
  - offer purchase (stub `NEXT_PUBLIC_BUY_URL_GUIDED`/`NEXT_PUBLIC_SCHEDULE_URL_GUIDED`, `vi.resetModules`): `confirmPurchase({ subscriber, sessionId, notifyAdmin: true, offerId: 'guided' })` → `'sent'`; `claimRepeatableEmailSend` called with `emailType: 'guided_confirmation'`; `sendAdminNotification` called with `(subscriber, 'Generator', false, { sessionId, existingSubscriber: true, offerName: 'Guided' })`; `sendTransactionalEmail` called with `subject: 'Pick a time for our conversation'` and `emailLabel: 'guided_confirmation'`.
  - unsubscribed subscriber + offer → `'sent'`.
  - `offerId: 'deep-dive'` (not pay-first) → `'unknown_offer'`, nothing sent, `console.error` spied.
  - `ConversationConfirmation` rendered (`render` from `react-email`) contains `Thank you for booking a conversation with me.`, the schedule URL as an `href`, and no `unsubscribe`.
  - `sendAdminNotification` (mock the Resend client as the module allows, or test a small exported pure `adminNotificationContent(...)` helper you extract for this) → subject `Guided purchase: Pat (Generator)`; guide case unchanged `Guide purchase: Pat (Generator)`.
- [ ] **Step 2:** `pnpm test:run tests/purchase.test.ts` → FAIL.
- [ ] **Step 3:** Implement per Interfaces; update imports in `app/api/subscribers/route.ts`, `app/api/guide/purchase/route.ts` (call sites keep guide behaviour in this task).
- [ ] **Step 4:** `pnpm test:run` → all pass; `npx tsc --noEmit` clean.

### Task 2: APIs accept which product was bought

**Files:**
- Modify: `app/api/subscribers/route.ts`, `app/api/guide/purchase/route.ts`
- Test: `tests/purchase-routes.test.ts` (new; mock `@/lib/db`, `@/lib/email/purchase`, `@/lib/email/send`, `@/lib/resend/contacts` as needed; call the exported `POST` with `new NextRequest(url, { method: 'POST', body })`)

**Interfaces:**
- Consumes: `confirmPurchase` (Task 1), `findOffer`, `isPayFirst`.
- Produces:
  - `/api/subscribers` body `guide_purchase: { session_id, offer_id? }` (field name kept for compatibility). Valid pay-first `offer_id` → admin notice gets `offerName`, `confirmPurchase` gets `offerId`. Invalid `offer_id` → subscriber still created (201), `console.error`, no confirmation, admin notice sent as a plain new signup.
  - `/api/guide/purchase` body `{ session_id, subscriber_id | email, offer_id? }`. Invalid `offer_id` → 400 `{ error: 'Unknown offer' }`. Valid → `confirmPurchase({ …, offerId })`. Still always `{ ok: true }` for well-formed requests whether or not a subscriber matched.
- [ ] **Step 1: Failing tests:** guide request (no `offer_id`) → `confirmPurchase` called without `offerId` (pins today); `offer_id: 'guided'` with env stubbed → called with `offerId: 'guided'`; `offer_id: 'nope'` → 400 on `/api/guide/purchase`; on `/api/subscribers` → 201, `confirmPurchase` not called, `console.error` spied.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement. **Step 4:** `pnpm test:run` + `npx tsc --noEmit` pass.

### Task 3: Shared purchase reporting + ChartForm purchase mode for offers

**Files:**
- Create: `components/purchase-report.tsx` (replaces `components/guide-purchase.tsx` and `components/offer-purchase.tsx`; delete both and their tests' imports)
- Modify: `components/chart-form.tsx`, `app/(public)/guide/thanks/page.tsx` (new prop/component names only)
- Modify: `lib/offers.ts` (helper below)
- Test: `tests/purchase-report.test.tsx` (replaces `tests/offer-purchase.test.tsx`), `tests/offers.test.ts`

**Interfaces:**
- Produces:
  - `<PurchaseReport sessionId item={{ id, name, price }} subscriberId? offerId? />` — once per session id in this browser (`firstTimeThisSession(\`purchase_${sessionId}\`)`): GA4 `purchase` (same payload as today) and, when `subscriberId` is set, `POST /api/guide/purchase` `{ session_id, subscriber_id, offer_id? }` (errors logged like `GuidePurchase` does). Renders null.
  - `ChartForm` prop `guidePurchase` → `purchase?: { sessionId: string | null; offer?: { id: string; scheduleUrl: string } }` (no `offer` = guide). With `offer`:
    - on-file email: report with `offer_id`, show the spec's copy #2 message and a "Pick your time" `TrackedLink` (`event="schedule_click"`, `params={{ offer: offer.id }}`, new tab) in place of the guide message; GA4 `purchase_details_on_file` with `{ product: offer.id }` (guide path fires the same event with `{ product: 'starter' }` instead of `guide_details_on_file`).
    - signup body `guide_purchase: { session_id, offer_id: offer.id }`.
    - after save: `router.push(offerThanksPath(offer.id, sessionId, id))` instead of the chart page.
  - `offerThanksPath(offerId: string, sessionId: string | null, subscriberId?: string): string` in `lib/offers.ts` → `/work-with-me/thanks?offer=<id>[&session_id=<sid>][&s=<subscriberId>]`.
- [ ] **Step 1: Failing tests:** `offerThanksPath('guided', 'cs_test_abc', '1111…')` exact string, and without session/subscriber; `PurchaseReport` mounted twice with same session → `track('purchase')` once and one `fetch` with `{ session_id, subscriber_id, offer_id: 'guided' }`; without `subscriberId` → no fetch; guide usage (no `offerId`) → body has no `offer_id`.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement; update CLAUDE.md's GA4 list (`purchase_details_on_file`). **Step 4:** `pnpm test:run` + `npx tsc --noEmit` pass.

### Task 4: Guided thank-you page asks new buyers for details first

**Files:**
- Modify: `app/(public)/work-with-me/thanks/page.tsx` (+ `page.module.css` only if needed)
- Test: `tests/work-with-me-thanks.test.tsx`, `tests/work-with-me-thanks-click.test.tsx`

**Interfaces:**
- Consumes: `PurchaseReport`, `ChartForm` `purchase` prop (Task 3), `getSubscriberById`, `isSubscriberId`, `getRememberedSubscriberId`, `RememberSubscriber`.
- Behaviour: buyer = `?s=` checked against the DB (render `RememberSubscriber` for it, as `/guide/thanks` does), else remembered cookie id looked up. Valid pay-first offer:
  - known buyer → `PurchaseReport` (when session valid) with `subscriberId` + `offerId`, then spec copy #3 (h1, lede, button, note).
  - unknown buyer → `PurchaseReport` (when session valid) without `subscriberId`, then spec copy #1 and `<ChartForm purchase={{ sessionId, offer: { id, scheduleUrl } }} />`; no scheduling button.
  - broken redirect fallback → spec copy #4 (keep the existing `console.error` and redirect rules).
- [ ] **Step 1: Failing tests** (mock `@/lib/db` `getSubscriberById`, `@/lib/subscriber-cookie-server`, and `@/components/chart-form` to a marker): known via `s=` → html has `Now pick a time for our conversation.`, `I’ve also emailed you this link, so you can book later.`, schedule link, no form marker; unknown → `One more step.` + form marker, no schedule link; `s=` not in DB and no cookie → unknown path; fallback → `Thank you for your payment.`; existing redirect cases unchanged. Update the click test to the known-buyer path.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement. **Step 4:** `pnpm test:run`, `npx tsc --noEmit`, `pnpm build`, `pnpm lint` all pass.

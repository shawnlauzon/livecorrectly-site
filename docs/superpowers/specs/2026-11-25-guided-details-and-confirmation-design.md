# Guided: birth details after paying, and a confirmation email

Builds on `2026-11-25-guided-pay-first-design.md` (shipped in `aa4284e`).
Status: approved by Shawn 2026-11-25 ("good enough for now").

## Why
Guided includes the personalized guide. Shawn needs the buyer's birth details
before anything else so he can write it. Picking a time can happen whenever the
buyer likes, so a buyer who doesn't book on the thank-you page must still be
able to find the scheduling link later.

## Goals
- Known subscriber (birth details on file): never asked again.
- Anyone else: gives birth details on the thank-you page **before** the
  "Pick your time" button appears.
- Every buyer gets one confirmation email with the scheduling link, so they can
  book later.
- Shawn's notification says the purchase was **Guided** (not the guide).

## Non-goals
- No Stripe API, webhook, or payment verification (unchanged).
- No new database tables or columns.
- Other offers unchanged (they aren't pay-first).

## Anti-goals
- A buyer who paid and can't find how to book.
- A known subscriber asked for details they already gave.
- A second, forked copy of the birth-details form or the purchase-confirmation
  code. The guide's existing flow is generalized, not copied.

## Approaches (for "book later")
- **A. Confirmation email with the scheduling link (chosen).**
- B. Link in Stripe's receipt: account-wide text, every buyer of anything would
  see it.
- C. Keep "email me if you lose this page": relies on the buyer writing in.

## Design

### Who the buyer is, on `/work-with-me/thanks`
Same order as `/guide/thanks`: an email link's `?s=` (checked against the
database), then the remember-me cookie. Unknown → treat as new buyer. A
subscriber who isn't recognised (e.g. declined cookies) types their email in
the form and is recognised as "details on file" — exactly as the guide's form
already does.

### Known subscriber
- Page shows the current "Now pick your time." content.
- On landing with a valid session id, the page reports the purchase (as
  `GuidePurchase` does for the guide): Shawn is notified, the buyer gets the
  confirmation email. Once per session id in the browser; the server also
  dedupes (one confirmation per subscriber per offer per day, as the guide does).

### New buyer
- Page shows the birth-details form first (the same `ChartForm` used on
  `/guide/thanks`, in its "after a purchase" mode), with heading/lede asking for
  details. No scheduling button yet.
- Submitting creates the subscriber as today (welcome series etc. unchanged),
  notifies Shawn ("Guided purchase"), and sends the confirmation email.
- If the email already has details on file: reported as a purchase by that
  subscriber (same as the guide's "details on file" path).
- After either, the buyer returns to `/work-with-me/thanks?offer=<id>&session_id=…&s=<subscriber id>`
  and sees "Now pick your time." (For "details on file", the form can't safely
  reveal the subscriber id, so it shows the scheduling button in place instead.)

### Generalizing the guide's purchase mode (one code path)
- `ChartForm`'s `guidePurchase` prop becomes a purchase of a named product:
  the guide or an offer id. Button label, "details on file" message, and where
  it goes after saving depend on the product.
- `/api/subscribers` `guide_purchase` and `/api/guide/purchase` accept which
  product was bought (absent = guide, so existing links keep working).
- `confirmGuidePurchase` becomes product-aware: guide → existing
  `GuideConfirmation` email; Guided → new confirmation email. Same dedupe,
  deliverability rules and admin-notification behaviour.
- `sendAdminNotification`'s purchase subject/body name the product
  ("Guided purchase: …", "Bought Guided. Stripe checkout session: …").

### Confirmation email (new template, transactional)
Plain note like `GuideConfirmation` (no layout, no unsubscribe), From `EMAIL_FROM`,
sent to unsubscribed people too (they asked for it), never to bounced/
complained/suppressed. **Proposed copy:**
Buyer-facing copy never uses the internal offer name ("Guided"): the buyer
thinks of it as booking a conversation with Shawn.
- Subject: `Pick a time for our conversation`
- Preview: `Your guide is on its way. Book whenever it suits you.`
- Body:
  - `{firstName},`
  - `Thank you for booking a conversation with me.`
  - `I’ll start with your personalized guide to living correctly. It will arrive at this email address within 24 hours.`
  - `Pick a time for our conversation whenever it suits you:` + button/link
    `Pick your time` → the offer's `scheduleUrl`
  - `If you have a question in the meantime, reply to this email.`
  - `—Shawn`
- Shawn's own notification may use the offer name ("Guided purchase: …").

### Thank-you page copy (approved by Shawn)
1. New buyer, before the form: eyebrow `Thank you`; h1 `One more step.`;
   lede `To write your personalized guide, I need your birth details. Then you can pick a time for our conversation.`;
   form button `Send my details` (existing purchase-mode label).
2. Email already has details (message under the form, then the button):
   `I already have your birth details for this email. Your personalized guide will be in your inbox within 24 hours.`
   + `Pick your time` button (same tracked link as 3).
3. Known subscriber, or after the form: eyebrow `Thank you`;
   h1 `Now pick a time for our conversation.`;
   lede `Your personalized guide will be in your inbox within 24 hours. Book our conversation whenever it suits you.`;
   button `Pick your time`; note `I’ve also emailed you this link, so you can book later.`
4. Broken redirect fallback: eyebrow `Thank you`; h1 `Thank you for your payment.`;
   lede `I’ll email you about next steps, including a link to pick a time for our conversation.`
   (Shawn follows up from Stripe's payment email; the site only logs the error.)

The guide's own copy on `/guide/thanks` and in `ChartForm`'s guide mode is unchanged.

### GA4
Unchanged events (`purchase`, `schedule_click`); the form keeps its existing
events (`form_start`, `chart_generated`, `generate_lead`,
`guide_details_on_file` → generalized name decided by the builder, documented in
CLAUDE.md).

## What Shawn does
Remove the birth-detail questions from the unpaid Guided Google schedule once
this is live.

## Left to the builder
Exact prop/parameter names for the product, the GA4 rename (if any), test
coverage, and how the "details on file" branch shows the button in place.

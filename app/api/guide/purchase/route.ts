import { NextRequest, NextResponse } from 'next/server';
import { getSubscriberById, getSubscriberByEmailIgnoreCase } from '@/lib/db';
import { confirmPurchase } from '@/lib/email/purchase';
import { isCheckoutSessionId, findOffer, isPayFirst } from '@/lib/offers';
import { isSubscriberId } from '@/lib/subscriber-cookie';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Reports a guide (or pay-first offer, via offer_id) purchase by someone whose birth details are already on file,
 * so they never submit the form that would otherwise notify Shawn:
 * - a remembered subscriber landing on /guide/thanks ({ session_id, subscriber_id })
 * - a buyer who typed an email that already has details ({ session_id, email })
 *
 * Requires the Stripe checkout session id from the redirect. Always answers
 * { ok: true } for a well-formed request, whether or not a subscriber matched,
 * so the endpoint can't be used to find out who is subscribed.
 */
export async function POST(request: NextRequest) {
  let body: { session_id?: unknown; subscriber_id?: unknown; email?: unknown; offer_id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!isCheckoutSessionId(body.session_id)) {
    return NextResponse.json({ error: 'A checkout session id is required' }, { status: 400 });
  }
  const sessionId = body.session_id;

  const subscriberId = isSubscriberId(body.subscriber_id) ? body.subscriber_id : null;
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (!subscriberId && !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'A subscriber id or email is required' }, { status: 400 });
  }

  // No offer_id means the guide; otherwise it must be a pay-first offer
  let offerId: string | undefined;
  if (body.offer_id !== undefined) {
    const offer = typeof body.offer_id === 'string' ? findOffer(body.offer_id) : undefined;
    if (!offer || !isPayFirst(offer)) {
      return NextResponse.json({ error: 'Unknown offer' }, { status: 400 });
    }
    offerId = offer.id;
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ ok: true });
  }

  try {
    const subscriber = subscriberId
      ? await getSubscriberById(subscriberId)
      : await getSubscriberByEmailIgnoreCase(email);
    if (subscriber) {
      const result = await confirmPurchase({ subscriber, sessionId, notifyAdmin: true, ...(offerId && { offerId }) });
      console.log(`[purchase] ${offerId ?? 'guide'} purchase ${result} for ${subscriber.email}`);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(`[purchase] Error handling ${offerId ?? 'guide'} purchase:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

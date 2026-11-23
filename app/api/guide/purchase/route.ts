import { NextRequest, NextResponse } from 'next/server';
import { getSubscriberById, getSubscriberByEmailIgnoreCase } from '@/lib/db';
import { confirmGuidePurchase } from '@/lib/email/guide-purchase';
import { isCheckoutSessionId } from '@/lib/offers';
import { isSubscriberId } from '@/lib/subscriber-cookie';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Reports a guide purchase by someone whose birth details are already on file,
 * so they never submit the form that would otherwise notify Shawn:
 * - a remembered subscriber landing on /guide/thanks ({ session_id, subscriber_id })
 * - a buyer who typed an email that already has details ({ session_id, email })
 *
 * Requires the Stripe checkout session id from the redirect. Always answers
 * { ok: true } for a well-formed request, whether or not a subscriber matched,
 * so the endpoint can't be used to find out who is subscribed.
 */
export async function POST(request: NextRequest) {
  let body: { session_id?: unknown; subscriber_id?: unknown; email?: unknown };
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

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ ok: true });
  }

  try {
    const subscriber = subscriberId
      ? await getSubscriberById(subscriberId)
      : await getSubscriberByEmailIgnoreCase(email);
    if (subscriber) {
      const result = await confirmGuidePurchase({ subscriber, sessionId, notifyAdmin: true });
      console.log(`[guide] purchase ${result} for ${subscriber.email}`);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[guide] Error handling purchase:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSubscriberById } from '@/lib/db';
import { guideBuyUrl } from '@/lib/offers';
import {
  GUIDE_BUYER_COOKIE,
  GUIDE_BUYER_COOKIE_MAX_AGE,
  isSubscriberId,
} from '@/lib/subscriber-cookie';

/**
 * Buy link for someone whose birth details are already on file: emails and the
 * design page link here (`/guide/buy?s=<subscriber id>`) instead of straight to
 * Stripe.
 *
 * Stripe's redirect back to /guide/thanks can't say who paid, so this notes the
 * buyer in a short-lived cookie first. That's how the thank-you page knows not
 * to ask for birth details again, on any device and whatever the visitor chose
 * about analytics cookies: it exists only to finish the purchase they started,
 * is never read by scripts, and expires in two hours.
 */
export async function GET(request: NextRequest) {
  const s = request.nextUrl.searchParams.get('s');
  const subscriber = isSubscriberId(s) ? await getSubscriberById(s) : null;

  const buyUrl = guideBuyUrl(subscriber?.id);
  if (!buyUrl) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const response = NextResponse.redirect(buyUrl);
  if (subscriber) {
    response.cookies.set(GUIDE_BUYER_COOKIE, subscriber.id, {
      path: '/guide',
      maxAge: GUIDE_BUYER_COOKIE_MAX_AGE,
      httpOnly: true,
      sameSite: 'lax',
      secure: request.nextUrl.protocol === 'https:',
    });
  }
  return response;
}

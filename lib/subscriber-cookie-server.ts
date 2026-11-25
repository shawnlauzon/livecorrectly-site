import { cookies } from 'next/headers';
import { GUIDE_BUYER_COOKIE, SUBSCRIBER_COOKIE, isSubscriberId } from './subscriber-cookie';

/**
 * Subscriber id remembered in the visitor's cookie, or null when absent or
 * malformed. Reading cookies() makes the calling route dynamic.
 */
export async function getRememberedSubscriberId(): Promise<string | null> {
  const value = (await cookies()).get(SUBSCRIBER_COOKIE)?.value;
  return isSubscriberId(value) ? value : null;
}

/**
 * Subscriber id noted by /guide/buy on the way to Stripe, or null. Only sent to
 * /guide paths, so read it from /guide/thanks.
 */
export async function getGuideBuyerId(): Promise<string | null> {
  const value = (await cookies()).get(GUIDE_BUYER_COOKIE)?.value;
  return isSubscriberId(value) ? value : null;
}

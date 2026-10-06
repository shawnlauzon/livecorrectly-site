import { cookies } from 'next/headers';
import { SUBSCRIBER_COOKIE, isSubscriberId } from './subscriber-cookie';

/**
 * Subscriber id remembered in the visitor's cookie, or null when absent or
 * malformed. Reading cookies() makes the calling route dynamic.
 */
export async function getRememberedSubscriberId(): Promise<string | null> {
  const value = (await cookies()).get(SUBSCRIBER_COOKIE)?.value;
  return isSubscriberId(value) ? value : null;
}

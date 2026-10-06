/**
 * "Remember me" cookie for newsletter readers: holds the subscriber id that
 * arrived via `?s=` so later visits stay personalized without it. Client-safe
 * (no server imports); the server reader lives in subscriber-cookie-server.ts.
 */
export const SUBSCRIBER_COOKIE = 'lc_sid';

/** One year, in seconds. */
export const SUBSCRIBER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True when the value is a well-formed subscriber id (uuid). */
export function isSubscriberId(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

/** `document.cookie` assignment that remembers `id`. */
export function rememberCookieString(id: string, secure: boolean): string {
  return `${SUBSCRIBER_COOKIE}=${id}; Path=/; Max-Age=${SUBSCRIBER_COOKIE_MAX_AGE}; SameSite=Lax${secure ? '; Secure' : ''}`;
}

/** `document.cookie` assignment that deletes the cookie. */
export function forgetCookieString(): string {
  return `${SUBSCRIBER_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

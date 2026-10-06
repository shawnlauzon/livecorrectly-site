import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SUBSCRIBER_COOKIE,
  SUBSCRIBER_COOKIE_MAX_AGE,
  forgetCookieString,
  isSubscriberId,
  rememberCookieString,
} from '@/lib/subscriber-cookie';

const ID = '11111111-2222-3333-4444-555555555555';

let cookieValue: string | undefined;
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === SUBSCRIBER_COOKIE && cookieValue !== undefined ? { value: cookieValue } : undefined,
  }),
}));

const { getRememberedSubscriberId } = await import('@/lib/subscriber-cookie-server');

describe('isSubscriberId', () => {
  it('accepts a uuid', () => {
    expect(isSubscriberId(ID)).toBe(true);
    expect(isSubscriberId(ID.toUpperCase())).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isSubscriberId('')).toBe(false);
    expect(isSubscriberId('not-a-uuid')).toBe(false);
    expect(isSubscriberId(`${ID}x`)).toBe(false);
    expect(isSubscriberId(undefined)).toBe(false);
    expect(isSubscriberId(['a'])).toBe(false);
  });
});

describe('cookie strings', () => {
  it('remembers for a year, site-wide, Lax, Secure on https', () => {
    expect(rememberCookieString(ID, true)).toBe(
      `${SUBSCRIBER_COOKIE}=${ID}; Path=/; Max-Age=${SUBSCRIBER_COOKIE_MAX_AGE}; SameSite=Lax; Secure`,
    );
    expect(rememberCookieString(ID, false)).not.toContain('Secure');
  });

  it('forgets by expiring immediately on the same path', () => {
    expect(forgetCookieString()).toBe(`${SUBSCRIBER_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`);
  });
});

describe('getRememberedSubscriberId', () => {
  beforeEach(() => {
    cookieValue = undefined;
  });

  it('returns the id from the cookie', async () => {
    cookieValue = ID;
    expect(await getRememberedSubscriberId()).toBe(ID);
  });

  it('returns null without a cookie', async () => {
    expect(await getRememberedSubscriberId()).toBeNull();
  });

  it('ignores a malformed cookie', async () => {
    cookieValue = 'garbage';
    expect(await getRememberedSubscriberId()).toBeNull();
  });
});

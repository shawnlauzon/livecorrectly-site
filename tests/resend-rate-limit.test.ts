import { describe, it, expect } from 'vitest';
import { createRateLimiter, paceResendClient } from '@/lib/resend/rate-limit';

const RATE_LIMITED = {
  data: null,
  error: { statusCode: 429, name: 'rate_limit_exceeded', message: 'Too many requests.' },
  headers: { 'retry-after': '2' },
};
const OK = { data: { id: 'x' }, error: null, headers: {} };

/** A clock the limiter sleeps on: sleeping just moves time forward. */
function fakeClock() {
  let now = 1_000;
  const sleeps: number[] = [];
  return {
    now: () => now,
    sleep: async (ms: number) => { sleeps.push(ms); now += ms; },
    advance: (ms: number) => { now += ms; },
    sleeps,
  };
}

describe('createRateLimiter', () => {
  it('starts requests at least the minimum interval apart', async () => {
    const clock = fakeClock();
    const limiter = createRateLimiter({ minIntervalMs: 125, ...clock });
    const starts: number[] = [];
    const request = async () => { starts.push(clock.now()); return OK; };

    await Promise.all([limiter(request), limiter(request), limiter(request)]);

    expect(starts[1] - starts[0]).toBeGreaterThanOrEqual(125);
    expect(starts[2] - starts[1]).toBeGreaterThanOrEqual(125);
  });

  it('does not wait when the previous request started long enough ago', async () => {
    const clock = fakeClock();
    const limiter = createRateLimiter({ minIntervalMs: 125, ...clock });
    await limiter(async () => OK);
    clock.advance(500);
    await limiter(async () => OK);
    expect(clock.sleeps).toEqual([]);
  });

  it('retries a rate-limited request after the time Resend asks for', async () => {
    const clock = fakeClock();
    const limiter = createRateLimiter({ minIntervalMs: 125, ...clock });
    const responses = [RATE_LIMITED, OK];
    let calls = 0;

    const result = await limiter(async () => responses[calls++]);

    expect(result).toBe(OK);
    expect(calls).toBe(2);
    expect(clock.sleeps).toContain(2000);
  });

  it('waits a second when a rate-limited response names no retry time', async () => {
    const clock = fakeClock();
    const limiter = createRateLimiter({ minIntervalMs: 125, ...clock });
    const responses = [{ ...RATE_LIMITED, headers: {} }, OK];
    let calls = 0;
    await limiter(async () => responses[calls++]);
    expect(clock.sleeps).toContain(1000);
  });

  it('returns the rate-limit error once the retries are used up', async () => {
    const clock = fakeClock();
    const limiter = createRateLimiter({ minIntervalMs: 125, maxRetries: 3, ...clock });
    let calls = 0;

    const result = await limiter(async () => { calls++; return RATE_LIMITED; });

    expect(result).toBe(RATE_LIMITED);
    expect(calls).toBe(4);
  });

  it('does not retry other errors', async () => {
    const clock = fakeClock();
    const limiter = createRateLimiter({ minIntervalMs: 125, ...clock });
    const notFound = { data: null, error: { statusCode: 404, name: 'not_found', message: 'nope' }, headers: {} };
    let calls = 0;

    const result = await limiter(async () => { calls++; return notFound; });

    expect(result).toBe(notFound);
    expect(calls).toBe(1);
  });

  it('keeps pacing later requests after one throws', async () => {
    const clock = fakeClock();
    const limiter = createRateLimiter({ minIntervalMs: 125, ...clock });
    await expect(limiter(async () => { throw new Error('network'); })).rejects.toThrow('network');
    expect(await limiter(async () => OK)).toBe(OK);
  });
});

describe('paceResendClient', () => {
  it('sends every request of the client through the limiter, with its arguments', async () => {
    const seen: unknown[][] = [];
    const client = {
      fetchRequest: async (...args: unknown[]) => { seen.push(args); return OK; },
    };
    const limited: string[] = [];
    paceResendClient(client, async request => { limited.push('limited'); return request(); });

    const result = await client.fetchRequest('/segments', { method: 'POST' });

    expect(result).toBe(OK);
    expect(limited).toEqual(['limited']);
    expect(seen).toEqual([['/segments', { method: 'POST' }]]);
  });
});

/**
 * Pacing for Resend API calls.
 *
 * Resend allows a fixed number of requests per second per account and answers
 * the rest with 429 `rate_limit_exceeded`. Scheduling a newsletter makes
 * several calls per subscriber, back to back, and Resend answers fast enough
 * that a large audience goes over the limit. So every request is spaced out,
 * and a 429 that still happens (another process shares the limit) is retried
 * after the time Resend asks for.
 */

/** Resend's limit is 10 requests per second; 8 leaves room for other callers. */
const MIN_INTERVAL_MS = 125;
/** How many times a rate-limited request is tried again before its error is returned. */
const MAX_RETRIES = 5;
/** Wait before a retry when the 429 response names no `retry-after`. */
const DEFAULT_RETRY_AFTER_MS = 1000;

/** The parts of a Resend SDK response the limiter reads. */
interface ResendResult {
  error: { statusCode?: number | null; name?: string } | null;
  headers?: Record<string, string> | null;
}

/** Runs a request under the limiter and resolves with its (possibly retried) result. */
export type RateLimiter = <T extends ResendResult>(request: () => Promise<T>) => Promise<T>;

function isRateLimited(result: ResendResult): boolean {
  return result.error?.statusCode === 429 || result.error?.name === 'rate_limit_exceeded';
}

/** Milliseconds a 429 response asks to wait (`retry-after` is in seconds). */
function retryAfterMs(result: ResendResult): number {
  const seconds = Number(result.headers?.['retry-after']);
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : DEFAULT_RETRY_AFTER_MS;
}

/**
 * Create a limiter that runs requests one at a time, starting each at least
 * `minIntervalMs` after the previous one, and retries rate-limited ones.
 * `now` and `sleep` are injectable for tests.
 */
export function createRateLimiter(options: {
  minIntervalMs?: number;
  maxRetries?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
} = {}): RateLimiter {
  const minIntervalMs = options.minIntervalMs ?? MIN_INTERVAL_MS;
  const maxRetries = options.maxRetries ?? MAX_RETRIES;
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));

  let lastStart = Number.NEGATIVE_INFINITY;
  let queue: Promise<unknown> = Promise.resolve();

  async function attempt<T extends ResendResult>(request: () => Promise<T>): Promise<T> {
    for (let retries = 0; ; retries++) {
      const wait = lastStart + minIntervalMs - now();
      if (wait > 0) await sleep(wait);
      lastStart = now();

      const result = await request();
      if (!isRateLimited(result) || retries >= maxRetries) return result;
      await sleep(retryAfterMs(result));
    }
  }

  return function limit<T extends ResendResult>(request: () => Promise<T>): Promise<T> {
    const result = queue.then(() => attempt(request));
    // The queue only orders requests: a failed one must not block those behind it
    queue = result.catch(() => undefined);
    return result;
  };
}

/** One limiter for the whole process: every Resend client shares the account's limit. */
const sharedLimiter = createRateLimiter();

/**
 * Route every API request of a Resend client through the limiter. All of the
 * SDK's resources (contacts, segments, broadcasts, emails…) call the client's
 * `fetchRequest`, so pacing that one method covers them all. Returns the client.
 */
export function paceResendClient<C extends { fetchRequest: (...args: never[]) => Promise<ResendResult> }>(
  client: C,
  limiter: RateLimiter = sharedLimiter,
): C {
  const fetchRequest = client.fetchRequest.bind(client) as (...args: unknown[]) => Promise<ResendResult>;
  (client as { fetchRequest: unknown }).fetchRequest = (...args: unknown[]) =>
    limiter(() => fetchRequest(...args));
  return client;
}

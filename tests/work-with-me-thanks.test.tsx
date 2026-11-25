import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const { redirect } = vi.hoisted(() => ({ redirect: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect }));
vi.mock('@/components/site-nav', () => ({ default: () => null }));
vi.mock('@/components/site-footer', () => ({ default: () => null }));
vi.mock('@/components/offer-purchase', () => ({ default: () => <i data-purchase /> }));
vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));

async function renderPage(
  params: Record<string, string | undefined>,
  env: { buy?: string; schedule?: string } = {
    buy: 'https://buy.stripe.com/test',
    schedule: 'https://calendar.app.google/test',
  },
) {
  vi.stubEnv('NEXT_PUBLIC_BUY_URL_GUIDED', env.buy ?? '');
  vi.stubEnv('NEXT_PUBLIC_SCHEDULE_URL_GUIDED', env.schedule ?? '');
  vi.resetModules();
  const { default: Page } = await import('@/app/(public)/work-with-me/thanks/page');
  return renderToStaticMarkup(await Page({ searchParams: Promise.resolve(params) }));
}

afterEach(() => {
  vi.restoreAllMocks();
});

beforeEach(() => {
  redirect.mockReset();
  redirect.mockImplementation((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  });
});

describe('/work-with-me/thanks', () => {
  it('shows the Pick your time button and records the purchase', async () => {
    const html = await renderPage({ offer: 'guided', session_id: 'cs_test_abc' });
    expect(html).toContain('Now pick your time.');
    expect(html).toMatch(/<a [^>]*href="https:\/\/calendar\.app\.google\/test"/);
    expect(html).toMatch(/<a [^>]*target="_blank"/);
    expect(html).toContain('data-purchase');
  });

  it('still shows the button without a session id, but no purchase', async () => {
    const html = await renderPage({ offer: 'guided' });
    expect(html).toContain('Pick your time');
    expect(html).not.toContain('data-purchase');
  });

  it('records no purchase for an unfilled Stripe placeholder', async () => {
    const html = await renderPage({ offer: 'guided', session_id: '{CHECKOUT_SESSION_ID}' });
    expect(html).not.toContain('data-purchase');
  });

  it.each([{ offer: 'deep-dive' }, { offer: 'nope' }, {}])(
    'redirects to /work-with-me for %j',
    async (params) => {
      await expect(renderPage(params)).rejects.toThrow('REDIRECT:/work-with-me');
      expect(redirect).toHaveBeenCalledWith('/work-with-me');
    },
  );

  describe('paid session whose offer cannot be resolved', () => {
    const FALLBACK = 'Thanks for booking.';

    it.each([
      ['an unknown offer', { offer: 'nope', session_id: 'cs_test_abc' }],
      ['no offer param', { session_id: 'cs_test_abc' }],
    ])('shows the fallback and logs for %s', async (_label, params) => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      const html = await renderPage(params);
      expect(redirect).not.toHaveBeenCalled();
      expect(html).toContain(FALLBACK);
      expect(html).not.toContain('data-purchase');
      expect(html).not.toContain('Pick your time');
      expect(error).toHaveBeenCalledTimes(1);
      expect(error.mock.calls[0][0]).toContain('cs_test_abc');
    });

    it('shows the fallback when the offer settings are incomplete', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      const html = await renderPage(
        { offer: 'guided', session_id: 'cs_test_abc' },
        { buy: 'https://buy.stripe.com/test' },
      );
      expect(redirect).not.toHaveBeenCalled();
      expect(html).toContain(FALLBACK);
      expect(error).toHaveBeenCalledTimes(1);
    });
  });
});

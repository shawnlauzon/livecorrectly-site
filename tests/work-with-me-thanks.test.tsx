import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const { redirect } = vi.hoisted(() => ({ redirect: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect }));
vi.mock('@/components/site-nav', () => ({ default: () => null }));
vi.mock('@/components/site-footer', () => ({ default: () => null }));
vi.mock('@/components/purchase-report', () => ({ default: () => <i data-purchase /> }));
vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));
const { getSubscriberById, getRememberedSubscriberId } = vi.hoisted(() => ({
  getSubscriberById: vi.fn(),
  getRememberedSubscriberId: vi.fn(),
}));
vi.mock('@/lib/db', () => ({ getSubscriberById }));
vi.mock('@/lib/subscriber-cookie-server', () => ({ getRememberedSubscriberId }));
vi.mock('@/components/chart-form', () => ({
  default: ({ purchase }: { purchase?: unknown }) => (
    <i data-chart-form data-purchase-prop={JSON.stringify(purchase)} />
  ),
}));
vi.mock('@/components/remember-subscriber', () => ({ default: () => <i data-remember /> }));

const SUB_ID = '123e4567-e89b-42d3-a456-426614174000';
const KNOWN = { id: SUB_ID };

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
  getSubscriberById.mockReset();
  getRememberedSubscriberId.mockReset();
  getSubscriberById.mockResolvedValue(null);
  getRememberedSubscriberId.mockResolvedValue(null);
  redirect.mockReset();
  redirect.mockImplementation((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  });
});

describe('/work-with-me/thanks', () => {
  describe('known buyer', () => {
    beforeEach(() => {
      getSubscriberById.mockImplementation(async (id: string) => (id === SUB_ID ? KNOWN : null));
    });

    it('via ?s= shows the schedule button and records the purchase', async () => {
      const html = await renderPage({ offer: 'guided', session_id: 'cs_test_abc', s: SUB_ID });
      expect(html).toContain('Now pick a time for our conversation.');
      expect(html).toContain('I\u2019ve also emailed you this link, so you can book later.');
      expect(html).toMatch(/<a [^>]*href="https:\/\/calendar\.app\.google\/test"/);
      expect(html).toMatch(/<a [^>]*target="_blank"/);
      expect(html).toContain('data-purchase');
      expect(html).toContain('data-remember');
      expect(html).not.toContain('data-chart-form');
    });

    it('via the remembered cookie shows the schedule button', async () => {
      getRememberedSubscriberId.mockResolvedValue(SUB_ID);
      const html = await renderPage({ offer: 'guided', session_id: 'cs_test_abc' });
      expect(html).toContain('Now pick a time for our conversation.');
      expect(html).not.toContain('data-chart-form');
      expect(html).not.toContain('data-remember');
    });

    it('still shows the button without a session id, but no purchase', async () => {
      const html = await renderPage({ offer: 'guided', s: SUB_ID });
      expect(html).toContain('Pick your time');
      expect(html).not.toContain('data-purchase');
    });

    it('says the link was emailed only when there is a session, since that is when the email is sent', async () => {
      const note = 'I\u2019ve also emailed you this link, so you can book later.';
      const withoutSession = await renderPage({ offer: 'guided', s: SUB_ID });
      expect(withoutSession).toContain('Pick your time');
      expect(withoutSession).not.toContain(note);
      const withSession = await renderPage({ offer: 'guided', session_id: 'cs_test_abc', s: SUB_ID });
      expect(withSession).toContain(note);
    });

    it('records no purchase for an unfilled Stripe placeholder', async () => {
      const html = await renderPage({
        offer: 'guided',
        session_id: '{CHECKOUT_SESSION_ID}',
        s: SUB_ID,
      });
      expect(html).not.toContain('data-purchase');
    });
  });

  describe('unknown buyer', () => {
    it('asks for details first, with no schedule link', async () => {
      const html = await renderPage({ offer: 'guided', session_id: 'cs_test_abc' });
      expect(html).toContain('One more step.');
      expect(html).toContain(
        'To write your personalized guide, I need your birth details. Then you can pick a time for our conversation.',
      );
      expect(html).toContain('data-chart-form');
      expect(html).toContain('data-purchase');
      expect(html).not.toMatch(/<a /);
      expect(html).not.toContain('Pick your time');
      expect(html).not.toContain('data-remember');
      const prop = /data-purchase-prop="([^"]*)"/.exec(html)![1].replace(/&quot;/g, '"');
      expect(JSON.parse(prop)).toEqual({
        sessionId: 'cs_test_abc',
        offer: { id: 'guided', scheduleUrl: 'https://calendar.app.google/test' },
      });
    });

    it('treats an ?s= that is not in the database, with no cookie, as unknown', async () => {
      const html = await renderPage({ offer: 'guided', session_id: 'cs_test_abc', s: SUB_ID });
      expect(getSubscriberById).toHaveBeenCalledWith(SUB_ID);
      expect(html).toContain('One more step.');
      expect(html).not.toContain('data-remember');
    });

    it('passes a null session id for an unfilled placeholder and reports no purchase', async () => {
      const html = await renderPage({ offer: 'guided', session_id: '{CHECKOUT_SESSION_ID}' });
      expect(html).toContain('data-chart-form');
      expect(html).not.toContain('data-purchase ');
      expect(html).toContain('&quot;sessionId&quot;:null');
    });
  });

  it.each([{ offer: 'deep-dive' }, { offer: 'nope' }, {}])(
    'redirects to /work-with-me for %j',
    async (params) => {
      await expect(renderPage(params)).rejects.toThrow('REDIRECT:/work-with-me');
      expect(redirect).toHaveBeenCalledWith('/work-with-me');
    },
  );

  describe('paid session whose offer cannot be resolved', () => {
    const FALLBACK = 'Thank you for your payment.';

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
      expect(html).toContain(
        'I\u2019ll email you about next steps, including a link to pick a time for our conversation.',
      );
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

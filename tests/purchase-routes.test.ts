import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
  createSubscriber: vi.fn(),
  advanceEmailSeries: vi.fn(),
  recordEmailSend: vi.fn(),
  getSubscriberById: vi.fn(),
  getSubscriberByEmailIgnoreCase: vi.fn(),
}));
vi.mock('@/lib/email/purchase', () => ({ confirmPurchase: vi.fn() }));
vi.mock('@/lib/email/send', () => ({
  sendWelcomeEmail: vi.fn(),
  sendAdminNotification: vi.fn(),
  formatEmailRecipient: vi.fn(),
  buildUnsubscribeUrl: vi.fn(),
}));
vi.mock('@/lib/resend/contacts', () => ({ syncContactToResend: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/hd-chart/parse-for-email', () => ({
  parseChartForEmail: vi.fn(() => ({ type: 'Generator' })),
}));

const SESSION = 'cs_live_a1B2c3';
const SUBSCRIBER_ID = '11111111-1111-4111-8111-111111111111';

const subscriber = {
  id: SUBSCRIBER_ID,
  email: 'pat@example.com',
  first_name: 'Pat',
  last_name: null,
  next_step: 0, // not fresh: skips welcome email; keep admin notice off for simple cases
  chart: { chart: {} },
};

function post(url: string, body: unknown) {
  return new NextRequest(`http://localhost${url}`, { method: 'POST', body: JSON.stringify(body) });
}

async function load() {
  vi.resetModules();
  const db = await import('@/lib/db');
  const purchase = await import('@/lib/email/purchase');
  const send = await import('@/lib/email/send');
  const subscribers = await import('@/app/api/subscribers/route');
  const guide = await import('@/app/api/guide/purchase/route');
  return { db, purchase, send, subscribers, guide };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('RESEND_API_KEY', 're_test');
  vi.stubEnv('NEXT_PUBLIC_BOOKING_URL', 'https://example.com/free');
  vi.stubEnv('NEXT_PUBLIC_BUY_URL_GUIDED', 'https://buy.stripe.com/test_guided');
  vi.stubEnv('NEXT_PUBLIC_SCHEDULE_URL_GUIDED', 'https://example.com/schedule');
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('POST /api/guide/purchase', () => {
  async function setup() {
    const m = await load();
    vi.mocked(m.db.getSubscriberById).mockResolvedValue(subscriber as never);
    vi.mocked(m.purchase.confirmPurchase).mockResolvedValue('sent');
    return m;
  }

  it('confirms the guide when no offer_id is sent', async () => {
    const m = await setup();
    const res = await m.guide.POST(post('/api/guide/purchase', { session_id: SESSION, subscriber_id: SUBSCRIBER_ID }));
    expect(res.status).toBe(200);
    expect(m.purchase.confirmPurchase).toHaveBeenCalledWith({ subscriber, sessionId: SESSION, notifyAdmin: true });
  });

  it('passes a valid pay-first offer_id through', async () => {
    const m = await setup();
    const res = await m.guide.POST(
      post('/api/guide/purchase', { session_id: SESSION, subscriber_id: SUBSCRIBER_ID, offer_id: 'guided' }),
    );
    expect(res.status).toBe(200);
    expect(m.purchase.confirmPurchase).toHaveBeenCalledWith({
      subscriber,
      sessionId: SESSION,
      notifyAdmin: true,
      offerId: 'guided',
    });
  });

  it('rejects an unknown offer_id with 400', async () => {
    const m = await setup();
    const res = await m.guide.POST(
      post('/api/guide/purchase', { session_id: SESSION, subscriber_id: SUBSCRIBER_ID, offer_id: 'nope' }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Unknown offer' });
    expect(m.purchase.confirmPurchase).not.toHaveBeenCalled();
  });
});

describe('POST /api/subscribers with guide_purchase', () => {
  const body = (purchase: object) => ({
    email: 'pat@example.com',
    first_name: 'Pat',
    birth_input: { date: '1990-01-01', city: 'Austin', country: 'US' },
    chart: { chart: {} },
    guide_purchase: purchase,
  });

  async function setup() {
    const m = await load();
    vi.mocked(m.db.createSubscriber).mockResolvedValue(subscriber as never);
    vi.mocked(m.send.sendAdminNotification).mockResolvedValue();
    vi.mocked(m.purchase.confirmPurchase).mockResolvedValue('sent');
    return m;
  }

  it('confirms the guide when no offer_id is sent', async () => {
    const m = await setup();
    const res = await m.subscribers.POST(post('/api/subscribers', body({ session_id: SESSION })));
    expect(res.status).toBe(201);
    expect(m.purchase.confirmPurchase).toHaveBeenCalledWith({ subscriber, sessionId: SESSION, notifyAdmin: true });
  });

  it('passes a valid offer to the confirmation and the admin notice', async () => {
    const m = await setup();
    vi.mocked(m.db.createSubscriber).mockResolvedValue({ ...subscriber, next_step: 1 } as never);
    const res = await m.subscribers.POST(
      post('/api/subscribers', body({ session_id: SESSION, offer_id: 'guided' })),
    );
    expect(res.status).toBe(201);
    expect(m.purchase.confirmPurchase).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: SESSION, offerId: 'guided' }),
    );
    expect(m.send.sendAdminNotification).toHaveBeenCalledWith(
      expect.anything(),
      'Generator',
      false,
      { sessionId: SESSION, offerName: 'Guided' },
    );
  });

  it('still signs the person up when offer_id is unknown, with no confirmation', async () => {
    const m = await setup();
    vi.mocked(m.db.createSubscriber).mockResolvedValue({ ...subscriber, next_step: 1 } as never);
    const res = await m.subscribers.POST(
      post('/api/subscribers', body({ session_id: SESSION, offer_id: 'nope' })),
    );
    expect(res.status).toBe(201);
    expect(m.purchase.confirmPurchase).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
    expect(m.send.sendAdminNotification).toHaveBeenCalledWith(expect.anything(), 'Generator', false, undefined);
  });
});

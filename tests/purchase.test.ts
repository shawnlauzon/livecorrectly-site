import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as React from 'react';
import { render } from 'react-email';
import type { Subscriber } from '@/lib/types/subscriber';

vi.mock('@/lib/db', () => ({
  claimRepeatableEmailSend: vi.fn(),
  setEmailSendResendId: vi.fn(),
}));
vi.mock('@/lib/hd-chart/parse-for-email', () => ({
  parseChartForEmail: vi.fn(() => ({ type: 'Generator' })),
}));
vi.mock('@/lib/email/send', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/email/send')>()),
  sendTransactionalEmail: vi.fn(),
  sendAdminNotification: vi.fn(),
}));

import { claimRepeatableEmailSend, setEmailSendResendId } from '@/lib/db';
import { sendAdminNotification, sendTransactionalEmail } from '@/lib/email/send';
import { confirmPurchase, GUIDE_CONFIRMATION_EMAIL_TYPE } from '@/lib/email/purchase';
import { GuideConfirmation } from '@/emails/guide-confirmation';
import { ConversationConfirmation } from '@/emails/conversation-confirmation';
import { adminNotificationContent } from '@/lib/email/send';
import { Welcome3 } from '@/emails/welcome3';

const SESSION = 'cs_live_a1B2c3';
const subscriber = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'pat@example.com',
  first_name: 'Pat',
  last_name: null,
  email_status: 'active',
  chart: { chart: {} },
} as unknown as Subscriber;

describe('confirmPurchase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(claimRepeatableEmailSend).mockResolvedValue(true);
    vi.mocked(sendAdminNotification).mockResolvedValue();
    vi.mocked(sendTransactionalEmail).mockResolvedValue({ success: true, id: 're_1' });
  });

  it('notifies Shawn and confirms to a buyer whose details were already on file', async () => {
    expect(await confirmPurchase({ subscriber, sessionId: SESSION, notifyAdmin: true })).toBe('sent');

    expect(sendAdminNotification).toHaveBeenCalledWith(subscriber, 'Generator', false, {
      sessionId: SESSION,
      existingSubscriber: true,
    });
    const sent = vi.mocked(sendTransactionalEmail).mock.calls[0][0];
    expect(sent.to).toBe('Pat <pat@example.com>');
    expect(sent.emailLabel).toBe(GUIDE_CONFIRMATION_EMAIL_TYPE);
    expect(setEmailSendResendId).toHaveBeenCalledWith(subscriber.id, GUIDE_CONFIRMATION_EMAIL_TYPE, 're_1');
  });

  it('leaves the admin notice to the signup for a brand-new buyer', async () => {
    expect(await confirmPurchase({ subscriber, sessionId: SESSION, notifyAdmin: false })).toBe('sent');
    expect(sendAdminNotification).not.toHaveBeenCalled();
    expect(sendTransactionalEmail).toHaveBeenCalledTimes(1);
  });

  it('sends nothing when the same purchase is reported again', async () => {
    vi.mocked(claimRepeatableEmailSend).mockResolvedValue(false);
    expect(await confirmPurchase({ subscriber, sessionId: SESSION, notifyAdmin: true })).toBe(
      'already_confirmed'
    );
    expect(sendAdminNotification).not.toHaveBeenCalled();
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
  });

  it('still notifies Shawn when the buyer address cannot receive mail', async () => {
    const bounced = { ...subscriber, email_status: 'bounced' } as Subscriber;
    expect(await confirmPurchase({ subscriber: bounced, sessionId: SESSION, notifyAdmin: true })).toBe(
      'not_deliverable'
    );
    expect(sendAdminNotification).toHaveBeenCalledTimes(1);
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
  });

  it('confirms to the buyer even if the admin notice fails', async () => {
    vi.mocked(sendAdminNotification).mockRejectedValue(new Error('resend down'));
    expect(await confirmPurchase({ subscriber, sessionId: SESSION, notifyAdmin: true })).toBe('sent');
  });
});

describe('confirmPurchase for a pay-first offer', () => {
  const SCHEDULE = 'https://calendar.example.com/guided';
  type Confirm = typeof import('@/lib/email/purchase').confirmPurchase;
  let confirm: Confirm;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(claimRepeatableEmailSend).mockResolvedValue(true);
    vi.mocked(sendAdminNotification).mockResolvedValue();
    vi.mocked(sendTransactionalEmail).mockResolvedValue({ success: true, id: 're_1' });
    vi.stubEnv('NEXT_PUBLIC_BUY_URL_GUIDED', 'https://buy.stripe.com/test_guided');
    vi.stubEnv('NEXT_PUBLIC_SCHEDULE_URL_GUIDED', SCHEDULE);
    vi.resetModules();
    confirm = (await import('@/lib/email/purchase')).confirmPurchase;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('confirms a Guided purchase with the conversation email and names the offer to Shawn', async () => {
    expect(await confirm({ subscriber, sessionId: SESSION, notifyAdmin: true, offerId: 'guided' })).toBe('sent');

    expect(claimRepeatableEmailSend).toHaveBeenCalledWith(
      expect.objectContaining({ emailType: 'guided_confirmation' })
    );
    expect(sendAdminNotification).toHaveBeenCalledWith(subscriber, 'Generator', false, {
      sessionId: SESSION,
      existingSubscriber: true,
      offerName: 'Guided',
    });
    const sent = vi.mocked(sendTransactionalEmail).mock.calls[0][0];
    expect(sent.subject).toBe('Pick a time for our conversation');
    expect(sent.emailLabel).toBe('guided_confirmation');
    expect(setEmailSendResendId).toHaveBeenCalledWith(subscriber.id, 'guided_confirmation', 're_1');
  });

  it('still confirms to an unsubscribed buyer', async () => {
    const unsub = { ...subscriber, email_status: 'unsubscribed' } as Subscriber;
    expect(await confirm({ subscriber: unsub, sessionId: SESSION, notifyAdmin: true, offerId: 'guided' })).toBe(
      'sent'
    );
  });

  it('refuses an offer that is not paid first, sending nothing', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await confirm({ subscriber, sessionId: SESSION, notifyAdmin: true, offerId: 'deep-dive' })).toBe(
      'unknown_offer'
    );
    expect(claimRepeatableEmailSend).not.toHaveBeenCalled();
    expect(sendAdminNotification).not.toHaveBeenCalled();
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('ConversationConfirmation email', () => {
  it('thanks the buyer, links to the schedule, and has no unsubscribe', async () => {
    const url = 'https://calendar.example.com/guided';
    const html = await render(React.createElement(ConversationConfirmation, { firstName: 'Pat', scheduleUrl: url }));
    expect(html).toContain('Thank you for booking a conversation with me.');
    expect(html).toContain(`href="${url}"`);
    expect(html.toLowerCase()).not.toContain('unsubscribe');
  });
});

describe('adminNotificationContent', () => {
  it('names the offer in the subject and line for an offer purchase', () => {
    const { subject, lines } = adminNotificationContent(subscriber, 'Generator', false, {
      sessionId: SESSION,
      offerName: 'Guided',
    });
    expect(subject).toBe('Guided purchase: Pat (Generator)');
    expect(lines).toContain(`Bought Guided. Stripe checkout session: ${SESSION}`);
  });

  it('keeps the guide wording without an offer name', () => {
    const { subject, lines } = adminNotificationContent(subscriber, 'Generator', false, { sessionId: null });
    expect(subject).toBe('Guide purchase: Pat (Generator)');
    expect(lines).toContain(
      'Bought the personalized guide. Stripe checkout session: none in the link (check Stripe before writing the guide)'
    );
  });
});

describe('GuideConfirmation email', () => {
  it('says when the guide arrives, as a plain note with no marketing footer', async () => {
    const html = await render(React.createElement(GuideConfirmation, { firstName: 'Pat' }));
    expect(html).toContain('24 hours');
    expect(html).not.toContain('Unsubscribe');
    expect(html).not.toContain('permission-slip');
  });
});

describe('Welcome3 guide offer', () => {
  const props = { ...Welcome3.PreviewProps };

  it('links to the guide when a buy link is given', async () => {
    const html = await render(
      React.createElement(Welcome3, { ...props, guideUrl: 'https://buy.stripe.com/test_abc?client_reference_id=x' })
    );
    expect(html).toContain('https://buy.stripe.com/test_abc?client_reference_id=x');
    expect(html).toContain('Get your guide');
  });

  it('leaves the offer out when there is no buy link', async () => {
    const html = await render(React.createElement(Welcome3, props));
    expect(html).not.toContain('Get your guide');
  });
});

describe('guideBuyPath', () => {
  it('routes a known subscriber through the site so the thank-you page recognises them', async () => {
    vi.stubEnv('NEXT_PUBLIC_BUY_URL_STARTER', 'https://buy.stripe.com/test_abc');
    vi.resetModules();
    const { guideBuyPath } = await import('@/lib/offers');
    expect(guideBuyPath('11111111-1111-4111-8111-111111111111')).toBe(
      '/guide/buy?s=11111111-1111-4111-8111-111111111111'
    );
    vi.unstubAllEnvs();
  });
});

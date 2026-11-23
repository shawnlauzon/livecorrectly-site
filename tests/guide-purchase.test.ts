import { describe, it, expect, vi, beforeEach } from 'vitest';
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
import { confirmGuidePurchase, GUIDE_CONFIRMATION_EMAIL_TYPE } from '@/lib/email/guide-purchase';
import { GuideConfirmation } from '@/emails/guide-confirmation';
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

describe('confirmGuidePurchase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(claimRepeatableEmailSend).mockResolvedValue(true);
    vi.mocked(sendAdminNotification).mockResolvedValue();
    vi.mocked(sendTransactionalEmail).mockResolvedValue({ success: true, id: 're_1' });
  });

  it('notifies Shawn and confirms to a buyer whose details were already on file', async () => {
    expect(await confirmGuidePurchase({ subscriber, sessionId: SESSION, notifyAdmin: true })).toBe('sent');

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
    expect(await confirmGuidePurchase({ subscriber, sessionId: SESSION, notifyAdmin: false })).toBe('sent');
    expect(sendAdminNotification).not.toHaveBeenCalled();
    expect(sendTransactionalEmail).toHaveBeenCalledTimes(1);
  });

  it('sends nothing when the same purchase is reported again', async () => {
    vi.mocked(claimRepeatableEmailSend).mockResolvedValue(false);
    expect(await confirmGuidePurchase({ subscriber, sessionId: SESSION, notifyAdmin: true })).toBe(
      'already_confirmed'
    );
    expect(sendAdminNotification).not.toHaveBeenCalled();
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
  });

  it('still notifies Shawn when the buyer address cannot receive mail', async () => {
    const bounced = { ...subscriber, email_status: 'bounced' } as Subscriber;
    expect(await confirmGuidePurchase({ subscriber: bounced, sessionId: SESSION, notifyAdmin: true })).toBe(
      'not_deliverable'
    );
    expect(sendAdminNotification).toHaveBeenCalledTimes(1);
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
  });

  it('confirms to the buyer even if the admin notice fails', async () => {
    vi.mocked(sendAdminNotification).mockRejectedValue(new Error('resend down'));
    expect(await confirmGuidePurchase({ subscriber, sessionId: SESSION, notifyAdmin: true })).toBe('sent');
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

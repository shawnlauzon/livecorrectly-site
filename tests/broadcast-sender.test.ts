import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../lib/resend/contacts', () => ({
  getResendClient: vi.fn(),
  ensureNeonIdProperty: vi.fn(),
  ensureChartContactProperties: vi.fn(),
}));
vi.mock('../lib/newsletter/email-loader', () => ({ getNewsletterIssue: vi.fn() }));
vi.mock('../lib/newsletter/loader', () => ({ loadNewsletterIssue: vi.fn() }));
vi.mock('../lib/newsletter/email-template', () => ({ renderNewsletterEmail: vi.fn() }));
vi.mock('../lib/newsletter/email', () => ({ getNewsletterSubject: vi.fn() }));
vi.mock('../lib/newsletter/resolve', () => ({ buildContactPropertyValues: vi.fn() }));
vi.mock('../lib/db', () => ({ upsertContactSyncState: vi.fn() }));

import { getBroadcastSender } from '../lib/resend/broadcasts';

beforeEach(() => {
  delete process.env.EMAIL_DOMAIN_BROADCAST;
  delete process.env.EMAIL_FROM;
  delete process.env.EMAIL_FROM_MARKETING;
});

describe('getBroadcastSender', () => {
  it('uses marketing From and EMAIL_FROM Reply-To when no domain override', () => {
    process.env.EMAIL_FROM_MARKETING = 'Shawn <updates@livecorrectly.com>';
    process.env.EMAIL_FROM = 'Shawn <shawn@livecorrectly.com>';
    expect(getBroadcastSender()).toEqual({
      from: 'Shawn <updates@livecorrectly.com>',
      replyTo: 'Shawn <shawn@livecorrectly.com>',
    });
  });

  it('uses shawn@DOMAIN with no Reply-To when the domain override is set (replies are captured by the inbound webhook)', () => {
    process.env.EMAIL_DOMAIN_BROADCAST = 'updates.livecorrectly.com';
    process.env.EMAIL_FROM = 'Shawn <shawn@livecorrectly.com>';
    expect(getBroadcastSender()).toEqual({
      from: 'Shawn Lauzon <shawn@updates.livecorrectly.com>',
      replyTo: undefined,
    });
  });

  it('falls back to hard-coded defaults', () => {
    expect(getBroadcastSender()).toEqual({
      from: 'Shawn Lauzon <updates@livecorrectly.com>',
      replyTo: 'Shawn Lauzon <shawn@livecorrectly.com>',
    });
  });
});

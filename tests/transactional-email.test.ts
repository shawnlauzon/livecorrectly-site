import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));
vi.mock('react-email', () => ({ render: vi.fn().mockResolvedValue('<p>hi</p>') }));
vi.mock('../lib/db', () => ({ getActiveSubscriberByEmail: vi.fn().mockResolvedValue(null) }));

import { sendTransactionalEmail } from '../lib/email/send';

beforeEach(() => {
  sendMock.mockReset();
  sendMock.mockResolvedValue({ data: { id: 're_1' }, error: null });
  process.env.RESEND_API_KEY = 're_test';
  process.env.EMAIL_FROM = 'Shawn Lauzon <shawn@livecorrectly.com>';
});

describe('sendTransactionalEmail', () => {
  it('sends even when the recipient is not an active subscriber', async () => {
    const result = await sendTransactionalEmail({
      to: 'pat@example.com',
      subject: 'Your link',
      react: React.createElement('p', null, 'hi'),
    });
    expect(result.success).toBe(true);
    expect(sendMock).toHaveBeenCalledOnce();
  });

  it('sends from EMAIL_FROM with no unsubscribe headers, tagged transactional', async () => {
    await sendTransactionalEmail({
      to: 'Pat <pat@example.com>',
      subject: 'Your link',
      react: React.createElement('p', null, 'hi'),
      emailLabel: 'chart_link',
    });

    const payload = sendMock.mock.calls[0][0];
    expect(payload.from).toBe('Shawn Lauzon <shawn@livecorrectly.com>');
    expect(payload).not.toHaveProperty('headers');
    expect(payload).not.toHaveProperty('replyTo');
    expect(payload.tags).toContainEqual({ name: 'category', value: 'transactional' });
  });
});

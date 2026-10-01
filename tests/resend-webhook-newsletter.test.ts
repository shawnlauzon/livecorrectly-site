import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createHmac } from 'crypto';
import { NextRequest } from 'next/server';

vi.mock('../lib/db', () => ({
  getSubscriberByEmailForWebhook: vi.fn(),
  updateEmailStatus: vi.fn(),
  rollBackEmailSeries: vi.fn(),
  recordEmailEvent: vi.fn(),
  lookupEmailSendByResendId: vi.fn(),
  lookupEmailTypeByBroadcastId: vi.fn(),
  getMostRecentEmailSend: vi.fn(),
  getScheduleByBroadcastId: vi.fn(),
  advanceEmailSeries: vi.fn(),
}));
vi.mock('../emails/send', () => ({
  extractEmail: (r: string) => r.match(/<(.+)>/)?.[1] ?? r,
  forwardInboundReply: vi.fn(),
}));
vi.mock('../lib/resend-contacts', () => ({
  getResendClient: vi.fn(),
  unsubscribeContactInResend: vi.fn(),
}));

import {
  getSubscriberByEmailForWebhook,
  rollBackEmailSeries,
  lookupEmailSendByResendId,
  getScheduleByBroadcastId,
  advanceEmailSeries,
  updateEmailStatus,
} from '../lib/db';
import { POST } from '../app/api/webhooks/resend/route';

const SECRET_BYTES = Buffer.from('test-webhook-secret');
process.env.RESEND_WEBHOOK_SECRET = `whsec_${SECRET_BYTES.toString('base64')}`;

function signedRequest(event: object): NextRequest {
  const body = JSON.stringify(event);
  const id = 'msg_1';
  const timestamp = '1700000000';
  const signature = createHmac('sha256', SECRET_BYTES)
    .update(`${id}.${timestamp}.${body}`)
    .digest('base64');
  return new NextRequest('http://localhost/api/webhooks/resend', {
    method: 'POST',
    body,
    headers: {
      'svix-id': id,
      'svix-timestamp': timestamp,
      'svix-signature': `v1,${signature}`,
    },
  });
}

const subscriber = { id: 'sub-1', next_step: 6, email_status: 'active' };

describe('Resend webhook — newsletter sends', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSubscriberByEmailForWebhook).mockResolvedValue(subscriber as never);
  });

  it('advances next_step for a direct (non-broadcast) newsletter email', async () => {
    vi.mocked(lookupEmailSendByResendId).mockResolvedValue({ email_type: 'newsletter_6' } as never);

    const res = await POST(signedRequest({
      type: 'email.sent',
      data: { email_id: 'e1', to: ['Pat <pat@example.com>'], tags: { category: 'newsletter', email_type: 'newsletter_6' } },
    }));

    expect(res.status).toBe(200);
    expect(advanceEmailSeries).toHaveBeenCalledWith('sub-1', 7);
  });

  it('advances next_step for a broadcast recipient', async () => {
    vi.mocked(getScheduleByBroadcastId).mockResolvedValue({ newsletter_num: 6 } as never);

    await POST(signedRequest({
      type: 'email.sent',
      data: { broadcast_id: 'bc-1', to: ['pat@example.com'] },
    }));

    expect(advanceEmailSeries).toHaveBeenCalledWith('sub-1', 7);
  });

  it('does not advance when next_step already moved past the issue', async () => {
    vi.mocked(getScheduleByBroadcastId).mockResolvedValue({ newsletter_num: 5 } as never);

    await POST(signedRequest({
      type: 'email.sent',
      data: { broadcast_id: 'bc-1', to: ['pat@example.com'] },
    }));

    expect(advanceEmailSeries).not.toHaveBeenCalled();
  });

  it('ignores email.sent for welcome emails', async () => {
    await POST(signedRequest({
      type: 'email.sent',
      data: { email_id: 'e2', to: ['pat@example.com'], tags: { category: 'welcome', email_type: 'welcome2' } },
    }));

    expect(lookupEmailSendByResendId).not.toHaveBeenCalled();
    expect(advanceEmailSeries).not.toHaveBeenCalled();
  });

  it('does not roll back next_step when a broadcast newsletter fails', async () => {
    await POST(signedRequest({
      type: 'email.failed',
      data: { broadcast_id: 'bc-1', to: ['pat@example.com'] },
    }));

    expect(updateEmailStatus).toHaveBeenCalledWith('sub-1', 'failed');
    expect(rollBackEmailSeries).not.toHaveBeenCalled();
  });

  it('does not roll back next_step when a direct newsletter fails', async () => {
    await POST(signedRequest({
      type: 'email.failed',
      data: { email_id: 'e1', to: ['pat@example.com'], tags: { category: 'newsletter' } },
    }));

    expect(rollBackEmailSeries).not.toHaveBeenCalled();
  });

  it('still rolls back next_step when a welcome email fails', async () => {
    await POST(signedRequest({
      type: 'email.failed',
      data: { email_id: 'e2', to: ['pat@example.com'], tags: { category: 'welcome' } },
    }));

    expect(rollBackEmailSeries).toHaveBeenCalledWith('sub-1');
  });
});

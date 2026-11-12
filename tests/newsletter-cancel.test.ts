import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const broadcastsRemove = vi.fn();
const emailsCancel = vi.fn();

vi.mock('../lib/admin-auth', () => ({
  checkAdminPassword: vi.fn((pwd: string) => pwd === 'secret'),
}));
vi.mock('../lib/db', () => ({
  getPendingSchedulesForNewsletter: vi.fn(),
  deleteNewsletterSchedule: vi.fn(),
  deleteEmailSendsForBroadcast: vi.fn(),
  deleteEmailSendsForResendEmails: vi.fn(),
}));
vi.mock('../lib/resend/contacts', () => ({
  getResendClient: () => ({
    broadcasts: { remove: broadcastsRemove },
    emails: { cancel: emailsCancel },
  }),
}));

import {
  getPendingSchedulesForNewsletter,
  deleteNewsletterSchedule,
  deleteEmailSendsForBroadcast,
} from '../lib/db';
import { POST } from '../app/api/admin/newsletters/cancel/route';

function cancelRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/admin/newsletters/cancel', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer secret' },
    body: JSON.stringify(body),
  });
}

function broadcastSchedule(id: number, broadcastId: string) {
  return {
    id, newsletter_num: 10001, kind: 'broadcast', broadcast_id: broadcastId, segment_id: `r${id}`,
    newsletter_segment_id: id, resend_email_ids: null, scheduled_at: '2026-11-12T15:00:00.000Z',
    subscriber_count: 5, status: 'scheduled', created_at: '2026-11-11T15:00:00.000Z',
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  broadcastsRemove.mockResolvedValue({ data: {}, error: null });
});

describe('POST /api/admin/newsletters/cancel', () => {
  it('returns 404 when nothing is scheduled', async () => {
    vi.mocked(getPendingSchedulesForNewsletter).mockResolvedValue([]);
    const res = await POST(cancelRequest({ newsletterNumber: 10001 }));
    expect(res.status).toBe(404);
  });

  it('cancels every pending send of a one-off scheduled to several segments', async () => {
    vi.mocked(getPendingSchedulesForNewsletter).mockResolvedValue([
      broadcastSchedule(31, 'bc-7'),
      broadcastSchedule(32, 'bc-8'),
    ] as never);

    const res = await POST(cancelRequest({ newsletterNumber: 10001 }));

    expect(res.status).toBe(200);
    expect(getPendingSchedulesForNewsletter).toHaveBeenCalledWith(10001);
    expect(broadcastsRemove).toHaveBeenCalledWith('bc-7');
    expect(broadcastsRemove).toHaveBeenCalledWith('bc-8');
    expect(deleteEmailSendsForBroadcast).toHaveBeenCalledWith('bc-7');
    expect(deleteEmailSendsForBroadcast).toHaveBeenCalledWith('bc-8');
    expect(deleteNewsletterSchedule).toHaveBeenCalledWith(31);
    expect(deleteNewsletterSchedule).toHaveBeenCalledWith(32);
  });
});

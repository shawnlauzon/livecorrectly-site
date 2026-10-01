import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NewsletterSchedule } from '../lib/db';

const broadcastsGet = vi.fn();
const emailsGet = vi.fn();

vi.mock('../lib/db', () => ({
  getDueUnfinalizedSchedules: vi.fn(),
  finalizeNewsletterSchedule: vi.fn(),
}));
vi.mock('../lib/resend-contacts', () => ({
  getResendClient: () => ({
    broadcasts: { get: broadcastsGet },
    emails: { get: emailsGet },
  }),
}));

import { getDueUnfinalizedSchedules, finalizeNewsletterSchedule } from '../lib/db';
import { finalizeDueSchedules } from '../lib/newsletter-finalize';

function schedule(overrides: Partial<NewsletterSchedule>): NewsletterSchedule {
  return {
    id: 8,
    newsletter_num: 8,
    kind: 'broadcast',
    broadcast_id: 'bc-8',
    segment_id: 'resend-seg',
    newsletter_segment_id: 4,
    resend_email_ids: null,
    scheduled_at: '2026-09-22T11:47:00.000Z',
    subscriber_count: 122,
    status: 'scheduled',
    created_at: '2026-09-21T17:41:50.144Z',
    ...overrides,
  };
}

describe('finalizeDueSchedules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(finalizeNewsletterSchedule).mockResolvedValue({ finalized: true, segmentAdvanced: true });
  });

  it('finalizes a broadcast Resend reports as sent, regardless of per-recipient webhooks', () => {
    // Regression: #8 stayed 'scheduled' because one unsubscribed recipient
    // never produced an email.sent webhook. Completion now comes from Resend.
    vi.mocked(getDueUnfinalizedSchedules).mockResolvedValue([schedule({})]);
    broadcastsGet.mockResolvedValue({ data: { status: 'sent' }, error: null });

    return finalizeDueSchedules().then(result => {
      expect(broadcastsGet).toHaveBeenCalledWith('bc-8');
      expect(finalizeNewsletterSchedule).toHaveBeenCalledWith(8);
      expect(result.finalized).toEqual([8]);
    });
  });

  it('leaves a broadcast that Resend has not sent yet', async () => {
    vi.mocked(getDueUnfinalizedSchedules).mockResolvedValue([schedule({})]);
    broadcastsGet.mockResolvedValue({ data: { status: 'queued' }, error: null });

    const result = await finalizeDueSchedules();
    expect(finalizeNewsletterSchedule).not.toHaveBeenCalled();
    expect(result.finalized).toEqual([]);
  });

  it('does not report a schedule another caller already finalized', async () => {
    vi.mocked(getDueUnfinalizedSchedules).mockResolvedValue([schedule({})]);
    broadcastsGet.mockResolvedValue({ data: { status: 'sent' }, error: null });
    vi.mocked(finalizeNewsletterSchedule).mockResolvedValue({ finalized: false, segmentAdvanced: false });

    const result = await finalizeDueSchedules();
    expect(result.finalized).toEqual([]);
  });

  it('waits until every direct email has left the scheduled/queued state', async () => {
    const direct = schedule({
      id: 10,
      kind: 'direct',
      broadcast_id: null,
      segment_id: null,
      newsletter_segment_id: null,
      resend_email_ids: ['e1', 'e2'],
    });
    vi.mocked(getDueUnfinalizedSchedules).mockResolvedValue([direct]);

    emailsGet.mockImplementation(async (id: string) => ({
      data: { last_event: id === 'e1' ? 'delivered' : 'scheduled' },
      error: null,
    }));
    await finalizeDueSchedules();
    expect(finalizeNewsletterSchedule).not.toHaveBeenCalled();

    emailsGet.mockImplementation(async (id: string) => ({
      data: { last_event: id === 'e1' ? 'delivered' : 'suppressed' },
      error: null,
    }));
    const result = await finalizeDueSchedules();
    expect(finalizeNewsletterSchedule).toHaveBeenCalledWith(10);
    expect(result.finalized).toEqual([10]);
  });

  it('keeps finalizing other schedules when one Resend lookup fails', async () => {
    vi.mocked(getDueUnfinalizedSchedules).mockResolvedValue([
      schedule({ id: 1, broadcast_id: 'bad' }),
      schedule({ id: 2, broadcast_id: 'good' }),
    ]);
    broadcastsGet.mockImplementation(async (id: string) =>
      id === 'bad'
        ? { data: null, error: { message: 'rate limited' } }
        : { data: { status: 'sent' }, error: null },
    );
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await finalizeDueSchedules();
    expect(result.finalized).toEqual([2]);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

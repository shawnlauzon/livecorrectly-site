import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { RawNewsletterIssue } from '../lib/newsletter/loader';
import type { NewsletterSegment } from '../lib/db';

const broadcastsCreate = vi.fn();
const segmentsCreate = vi.fn();

vi.mock('../lib/admin-auth', () => ({
  checkAdminPassword: vi.fn((pwd: string) => pwd === 'secret'),
}));
vi.mock('../lib/db', () => ({
  getNewsletterDueSubscribers: vi.fn(),
  getNewsletterSubscribersByEmails: vi.fn(),
  getSubscriberByEmail: vi.fn(),
  recordEmailSend: vi.fn(),
  insertNewsletterSchedule: vi.fn(),
  getScheduleForNewsletter: vi.fn(),
  updateNewsletterIssueLiquidMap: vi.fn(),
  getNewsletterPublication: vi.fn(),
  getNewsletterEngagementBatch: vi.fn(),
  getNewsletterSegments: vi.fn(),
  getNewsletterSegmentsForIssue: vi.fn(),
  insertNewsletterSegment: vi.fn(),
}));
vi.mock('../lib/newsletter/loader', () => ({
  loadNewsletterIssue: vi.fn(),
}));
vi.mock('../lib/resend/broadcasts', () => ({
  renderNewsletterForBroadcast: vi.fn(async () => ({ html: '<p>hi</p>', subject: 'Hello' })),
  renderNewsletterForBroadcastWithHtml: vi.fn(),
  syncContactProperties: vi.fn(),
  getBroadcastSender: () => ({ from: 'Shawn <shawn@example.com>', replyTo: undefined }),
}));
vi.mock('../lib/resend/contacts', () => ({
  getResendClient: () => ({
    broadcasts: { create: broadcastsCreate },
    segments: { create: segmentsCreate, list: vi.fn(async () => ({ data: { data: [] }, error: null })) },
    contacts: { update: vi.fn() },
  }),
  createPropertyIfMissing: vi.fn(),
  deleteNewsletterProperties: vi.fn(),
}));
vi.mock('../lib/newsletter/segments', () => ({
  addEmailsToSegment: vi.fn(),
  removeNewsletterSegment: vi.fn(),
  listSegmentContacts: vi.fn(),
}));
vi.mock('../lib/newsletter/notes', () => ({
  getNoteForSend: vi.fn(async () => null),
}));

import {
  getNewsletterSegments,
  getNewsletterSubscribersByEmails,
  getNewsletterDueSubscribers,
  getNewsletterSegmentsForIssue,
  getScheduleForNewsletter,
  getNewsletterPublication,
  recordEmailSend,
  insertNewsletterSchedule,
  insertNewsletterSegment,
} from '../lib/db';
import { loadNewsletterIssue } from '../lib/newsletter/loader';
import { addEmailsToSegment, listSegmentContacts } from '../lib/newsletter/segments';
import { POST } from '../app/api/admin/newsletters/schedule/route';

function issue(overrides: Partial<RawNewsletterIssue>): RawNewsletterIssue {
  return {
    number: 10001,
    newsletterId: 1,
    subject: 'Hello',
    preview: '',
    slug: null,
    description: '',
    oldSlugs: [],
    rawPs: [],
    bodyJson: {},
    bodyHtml: '<p>hi</p>',
    liquidSectionMap: null,
    oneOff: true,
    updatedAt: '2026-10-20T00:00:00.000Z',
    createdAt: '2026-10-20T00:00:00.000Z',
    ...overrides,
  };
}

const segment: NewsletterSegment = {
  id: 7,
  newsletterId: 1,
  name: '2026-10-06 (from #4)',
  resendSegmentId: 'resend-seg-7',
  nextIssue: 6,
  createdAt: '2026-10-06T00:00:00.000Z',
};

const otherSegment: NewsletterSegment = {
  id: 8,
  newsletterId: 1,
  name: 'OGs',
  resendSegmentId: 'resend-seg-8',
  nextIssue: 9,
  createdAt: '2026-09-01T00:00:00.000Z',
};

const pat = { id: 'sub-1', email: 'pat@example.com', first_name: 'Pat', last_name: null, next_step: 6, chart: null };
const sam = { id: 'sub-2', email: 'sam@example.com', first_name: 'Sam', last_name: null, next_step: 6, chart: null };
const kim = { id: 'sub-3', email: 'kim@example.com', first_name: 'Kim', last_name: null, next_step: 9, chart: null };

function scheduleRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/admin/newsletters/schedule', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer secret' },
    body: JSON.stringify(body),
  });
}

async function readEvents(res: Response): Promise<Record<string, unknown>[]> {
  const text = await res.text();
  return text.trim().split('\n').map(line => JSON.parse(line));
}

const sendAt = '2026-10-27T15:00:00.000Z';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getNewsletterPublication).mockResolvedValue(null);
  vi.mocked(getScheduleForNewsletter).mockResolvedValue(null);
  vi.mocked(getNewsletterSegments).mockResolvedValue([segment]);
  vi.mocked(listSegmentContacts).mockResolvedValue([
    { email: 'Pat@Example.com', firstName: 'Pat', lastName: null },
    { email: 'sam@example.com', firstName: 'Sam', lastName: null },
  ]);
  vi.mocked(getNewsletterSubscribersByEmails).mockResolvedValue([pat, sam] as never);
  vi.mocked(insertNewsletterSchedule).mockResolvedValue({ id: 31 } as never);
  broadcastsCreate.mockResolvedValue({ data: { id: 'bc-1' }, error: null });
});

describe('scheduling a one-off issue', () => {
  it('requires a segment', async () => {
    vi.mocked(loadNewsletterIssue).mockResolvedValue(issue({}));
    const res = await POST(scheduleRequest({ newsletterNumber: 10001, sendAt }));
    expect(res.status).toBe(400);
    expect(broadcastsCreate).not.toHaveBeenCalled();
  });

  it('requires at least one segment', async () => {
    vi.mocked(loadNewsletterIssue).mockResolvedValue(issue({}));
    const res = await POST(scheduleRequest({ newsletterNumber: 10001, sendAt, segmentIds: [] }));
    expect(res.status).toBe(400);
    expect(broadcastsCreate).not.toHaveBeenCalled();
  });

  it('refuses the same segment twice', async () => {
    vi.mocked(loadNewsletterIssue).mockResolvedValue(issue({}));
    const res = await POST(scheduleRequest({ newsletterNumber: 10001, sendAt, segmentIds: [7, 7] }));
    expect(res.status).toBe(400);
    expect(broadcastsCreate).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown segment', async () => {
    vi.mocked(loadNewsletterIssue).mockResolvedValue(issue({}));
    const res = await POST(scheduleRequest({ newsletterNumber: 10001, sendAt, segmentIds: [99] }));
    expect(res.status).toBe(404);
    expect(broadcastsCreate).not.toHaveBeenCalled();
  });

  it('returns 422 when no one in the segment can receive it', async () => {
    vi.mocked(loadNewsletterIssue).mockResolvedValue(issue({}));
    vi.mocked(getNewsletterSubscribersByEmails).mockResolvedValue([]);
    const res = await POST(scheduleRequest({ newsletterNumber: 10001, sendAt, segmentIds: [7] }));
    expect(res.status).toBe(422);
  });

  it('returns 422 naming a chosen segment no one in which can receive it', async () => {
    vi.mocked(loadNewsletterIssue).mockResolvedValue(issue({}));
    vi.mocked(getNewsletterSegments).mockResolvedValue([segment, otherSegment]);
    vi.mocked(getNewsletterSubscribersByEmails)
      .mockResolvedValueOnce([pat, sam] as never)
      .mockResolvedValueOnce([]);
    const res = await POST(scheduleRequest({ newsletterNumber: 10001, sendAt, segmentIds: [7, 8] }));
    expect(res.status).toBe(422);
    expect((await res.json()).error).toContain('OGs');
    expect(broadcastsCreate).not.toHaveBeenCalled();
  });

  it("broadcasts to the chosen segment's contacts, without touching the series audience", async () => {
    vi.mocked(loadNewsletterIssue).mockResolvedValue(issue({}));
    const res = await POST(scheduleRequest({ newsletterNumber: 10001, sendAt, segmentIds: [7] }));
    const events = await readEvents(res);

    expect(events.find(e => e.step === 'error')).toBeUndefined();
    expect(listSegmentContacts).toHaveBeenCalledWith('resend-seg-7');
    expect(getNewsletterSubscribersByEmails).toHaveBeenCalledWith(['Pat@Example.com', 'sam@example.com']);

    // The series audience is never consulted, and no segment is created or added to
    expect(getNewsletterDueSubscribers).not.toHaveBeenCalled();
    expect(getNewsletterSegmentsForIssue).not.toHaveBeenCalled();
    expect(segmentsCreate).not.toHaveBeenCalled();
    expect(insertNewsletterSegment).not.toHaveBeenCalled();
    expect(addEmailsToSegment).not.toHaveBeenCalled();

    expect(broadcastsCreate).toHaveBeenCalledWith(expect.objectContaining({
      segmentId: 'resend-seg-7',
      scheduledAt: sendAt,
      name: expect.stringMatching(/^One-off 1 — /),
    }));
    expect(recordEmailSend).toHaveBeenCalledTimes(2);
    expect(recordEmailSend).toHaveBeenCalledWith(expect.objectContaining({
      subscriberId: 'sub-1',
      emailType: 'newsletter_10001',
      resendBroadcastId: 'bc-1',
    }));
    expect(insertNewsletterSchedule).toHaveBeenCalledWith(expect.objectContaining({
      newsletterNum: 10001,
      kind: 'broadcast',
      segmentId: 'resend-seg-7',
      newsletterSegmentId: 7,
      subscriberCount: 2,
    }));
    expect(events.at(-1)).toMatchObject({ step: 'complete', result: { contactCount: 2, broadcastIds: ['bc-1'] } });
  });

  it('schedules a separate broadcast to each chosen segment, at the same time', async () => {
    vi.mocked(loadNewsletterIssue).mockResolvedValue(issue({}));
    vi.mocked(getNewsletterSegments).mockResolvedValue([segment, otherSegment]);
    vi.mocked(listSegmentContacts).mockImplementation(async (id: string) => (
      id === 'resend-seg-7'
        ? [
            { email: 'pat@example.com', firstName: 'Pat', lastName: null },
            { email: 'sam@example.com', firstName: 'Sam', lastName: null },
          ]
        : [{ email: 'kim@example.com', firstName: 'Kim', lastName: null }]
    ));
    vi.mocked(getNewsletterSubscribersByEmails).mockImplementation(async (emails: string[]) => (
      [pat, sam, kim].filter(s => emails.includes(s.email)) as never
    ));
    broadcastsCreate
      .mockResolvedValueOnce({ data: { id: 'bc-7' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'bc-8' }, error: null });
    vi.mocked(insertNewsletterSchedule)
      .mockResolvedValueOnce({ id: 31 } as never)
      .mockResolvedValueOnce({ id: 32 } as never);

    const res = await POST(scheduleRequest({ newsletterNumber: 10001, sendAt, segmentIds: [7, 8] }));
    const events = await readEvents(res);

    expect(events.find(e => e.step === 'error')).toBeUndefined();
    expect(segmentsCreate).not.toHaveBeenCalled();
    expect(addEmailsToSegment).not.toHaveBeenCalled();

    expect(broadcastsCreate).toHaveBeenCalledTimes(2);
    expect(broadcastsCreate).toHaveBeenCalledWith(expect.objectContaining({ segmentId: 'resend-seg-7', scheduledAt: sendAt }));
    expect(broadcastsCreate).toHaveBeenCalledWith(expect.objectContaining({ segmentId: 'resend-seg-8', scheduledAt: sendAt }));

    // Each recipient's send is recorded against the broadcast that reaches them
    expect(recordEmailSend).toHaveBeenCalledTimes(3);
    expect(recordEmailSend).toHaveBeenCalledWith(expect.objectContaining({ subscriberId: 'sub-1', resendBroadcastId: 'bc-7' }));
    expect(recordEmailSend).toHaveBeenCalledWith(expect.objectContaining({ subscriberId: 'sub-2', resendBroadcastId: 'bc-7' }));
    expect(recordEmailSend).toHaveBeenCalledWith(expect.objectContaining({ subscriberId: 'sub-3', resendBroadcastId: 'bc-8' }));

    expect(insertNewsletterSchedule).toHaveBeenCalledTimes(2);
    expect(insertNewsletterSchedule).toHaveBeenCalledWith(expect.objectContaining({
      broadcastId: 'bc-7', segmentId: 'resend-seg-7', newsletterSegmentId: 7, subscriberCount: 2,
    }));
    expect(insertNewsletterSchedule).toHaveBeenCalledWith(expect.objectContaining({
      broadcastId: 'bc-8', segmentId: 'resend-seg-8', newsletterSegmentId: 8, subscriberCount: 1,
    }));
    expect(events.at(-1)).toMatchObject({
      step: 'complete',
      result: { contactCount: 3, broadcastIds: ['bc-7', 'bc-8'] },
    });
  });
});

describe('scheduling a series issue', () => {
  it('refuses a chosen segment', async () => {
    vi.mocked(loadNewsletterIssue).mockResolvedValue(issue({ number: 6, oneOff: false }));
    const res = await POST(scheduleRequest({ newsletterNumber: 6, sendAt, segmentIds: [7] }));
    expect(res.status).toBe(400);
    expect(broadcastsCreate).not.toHaveBeenCalled();
  });
});

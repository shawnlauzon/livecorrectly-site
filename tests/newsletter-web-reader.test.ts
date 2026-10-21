import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RawNewsletterIssue } from '@/lib/newsletter/loader';

vi.mock('@/lib/db', () => ({
  getNewsletterSendDates: vi.fn(),
  getNewsletterEngagement: vi.fn(),
}));
vi.mock('@/lib/newsletter/loader', () => ({
  loadAllNewsletterIssues: vi.fn(),
}));

import { getNewsletterSendDates, getNewsletterEngagement } from '@/lib/db';
import { loadAllNewsletterIssues } from '@/lib/newsletter/loader';
import { getWebNewsletter, getWebNewsletters, getSlugRedirects } from '@/lib/newsletter/web';

const issue: RawNewsletterIssue = {
  number: 3,
  newsletterId: 1,
  subject: 'Issue three',
  preview: '',
  slug: 'issue-three',
  description: '',
  oldSlugs: [],
  rawPs: [],
  bodyJson: {},
  bodyHtml: "<p>Hey {{ first_name | default: 'there' }},</p>",
  liquidSectionMap: null,
  oneOff: false,
  updatedAt: '2026-09-29T00:00:00.000Z',
  createdAt: '2026-09-29T00:00:00.000Z',
};

describe('getWebNewsletter reader personalization', () => {
  beforeEach(() => {
    vi.mocked(loadAllNewsletterIssues).mockResolvedValue(new Map([[3, issue]]));
    vi.mocked(getNewsletterSendDates).mockResolvedValue(new Map([[3, '2026-09-30T13:00:00.000Z']]));
    vi.mocked(getNewsletterEngagement).mockResolvedValue(new Map());
  });

  it("greets a known subscriber by first name", async () => {
    const result = await getWebNewsletter('issue-three', {
      subscriberId: '00000000-0000-0000-0000-000000000001',
      firstName: 'Shawn',
    });
    expect(result?.bodyHtml).toBe('<p>Hey Shawn,</p>');
  });

  it("falls back to the default without a subscriber", async () => {
    const result = await getWebNewsletter('issue-three');
    expect(result?.bodyHtml).toBe('<p>Hey there,</p>');
  });
});

describe('one-off issues', () => {
  const oneOff: RawNewsletterIssue = {
    ...issue,
    number: 10001,
    slug: 'one-off',
    oldSlugs: ['old-one-off'],
    oneOff: true,
  };

  beforeEach(() => {
    vi.mocked(loadAllNewsletterIssues).mockResolvedValue(new Map([[3, issue], [10001, oneOff]]));
    vi.mocked(getNewsletterSendDates).mockResolvedValue(new Map([
      [3, '2026-09-30T13:00:00.000Z'],
      [10001, '2026-10-01T13:00:00.000Z'],
    ]));
    vi.mocked(getNewsletterEngagement).mockResolvedValue(new Map());
  });

  it('are left out of the library even when sent and given a slug', async () => {
    const all = await getWebNewsletters();
    expect(all.map(n => n.number)).toEqual([3]);
  });

  it('have no web page', async () => {
    expect(await getWebNewsletter('one-off')).toBeNull();
  });

  it('get no slug redirects', async () => {
    expect((await getSlugRedirects()).has('old-one-off')).toBe(false);
  });
});

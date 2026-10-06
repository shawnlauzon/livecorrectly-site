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
import { getWebNewsletter } from '@/lib/newsletter/web';

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

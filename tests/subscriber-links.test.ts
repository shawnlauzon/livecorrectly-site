import { describe, it, expect, vi } from 'vitest';
import type { RawNewsletterIssue } from '@/lib/newsletter/loader';
import { LIBRARY_BLOCK_COPY, LIBRARY_BLOCK_TOKEN } from '@/lib/newsletter/library-block';

const raw: RawNewsletterIssue = {
  number: 7,
  newsletterId: 1,
  subject: 'Issue seven',
  preview: 'Preview',
  slug: 'issue-seven',
  description: '',
  oldSlugs: [],
  rawPs: [],
  bodyJson: null,
  bodyHtml: '',
  liquidSectionMap: null,
  updatedAt: '2026-10-01T00:00:00.000Z',
};

vi.mock('../lib/newsletter/loader', () => ({
  loadNewsletterIssue: vi.fn(async () => raw),
}));

const { renderNewsletterForBroadcastWithHtml } = await import('@/lib/resend/broadcasts');

describe('renderNewsletterForBroadcastWithHtml (Liquid broadcast path)', () => {
  // Regression: this path used to run only replaceVars, so relative links and
  // other subscriber links went out unresolved.
  it('resolves relative links with the Resend subscriber placeholder', async () => {
    const { html } = await renderNewsletterForBroadcastWithHtml(
      7,
      '<p><a href="/lunar-cycle" data-relative="true">Your cycle</a></p>',
    );
    expect(html).toContain('/see-your-design/{{{contact.neon_id}}}/lunar-cycle?utm_source=livecorrectly');
    expect(html).not.toContain('data-relative');
  });

  it('renders the newsletter library block', async () => {
    const { html } = await renderNewsletterForBroadcastWithHtml(
      7,
      `<p style="margin:0">${LIBRARY_BLOCK_TOKEN}</p>`,
    );
    expect(html).toContain(LIBRARY_BLOCK_COPY.heading);
    expect(html).toContain(
      '/newsletter?s={{{contact.neon_id}}}&utm_source=livecorrectly&utm_medium=email&utm_campaign=newsletter_7',
    );
    expect(html).not.toContain(LIBRARY_BLOCK_TOKEN);
  });
});

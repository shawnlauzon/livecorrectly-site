import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RawNewsletterIssue } from '@/lib/newsletter/loader';
import type { Subscriber } from '@/lib/types/subscriber';
import { injectEmailChrome } from '@/lib/newsletter/inject-chrome';
import { LIBRARY_BLOCK_COPY } from '@/lib/newsletter/library-block';

const DOC = '<html><head></head><body style="x"><table><tr><td>BODY CONTENT</td></tr></table></body></html>';
const MASTHEAD = 'permission-slip.png';
const SIGNATURE = 'shawn-lauzon-headshot.jpg';
const LIBRARY = LIBRARY_BLOCK_COPY.heading;

function issue(oneOff: boolean): RawNewsletterIssue {
  return {
    number: oneOff ? 10001 : 7,
    newsletterId: 1,
    subject: 'Hello',
    preview: 'Preview',
    slug: null,
    description: '',
    oldSlugs: [],
    rawPs: [],
    bodyJson: null,
    bodyHtml: DOC,
    liquidSectionMap: null,
    oneOff,
    updatedAt: '2026-11-26T00:00:00.000Z',
    createdAt: '2026-11-26T00:00:00.000Z',
  };
}

vi.mock('../lib/newsletter/loader', () => ({ loadNewsletterIssue: vi.fn() }));

const { loadNewsletterIssue } = await import('@/lib/newsletter/loader');
const { renderNewsletterForBroadcast, renderNewsletterForBroadcastWithHtml } = await import('@/lib/resend/broadcasts');
const { getNewsletterHtml } = await import('@/lib/newsletter/email');
const { getNewsletterIssue } = await import('@/lib/newsletter/email-loader');

const subscriber = { id: 'sub-1', first_name: 'Pat' } as Subscriber;

beforeEach(() => {
  vi.mocked(loadNewsletterIssue).mockReset();
});

describe('injectEmailChrome masthead', () => {
  const options = { appUrl: 'https://example.com', unsubscribeUrl: '#', postscripts: [] };

  it('shows the masthead by default', () => {
    expect(injectEmailChrome(DOC, options)).toContain(MASTHEAD);
  });

  it('leaves the masthead out when asked, keeping the note, body, signature and footer', () => {
    const html = injectEmailChrome(DOC, { ...options, note: 'NOTE TEXT', masthead: false });
    expect(html).not.toContain(MASTHEAD);
    expect(html).toContain('NOTE TEXT');
    expect(html).toContain('BODY CONTENT');
    expect(html).toContain(SIGNATURE);
    expect(html).toContain('href="#"');
  });
});

describe('getNewsletterIssue', () => {
  it('says whether the issue is a one-off', async () => {
    vi.mocked(loadNewsletterIssue).mockResolvedValue(issue(true));
    expect((await getNewsletterIssue(10001, 'Pat'))?.oneOff).toBe(true);
    vi.mocked(loadNewsletterIssue).mockResolvedValue(issue(false));
    expect((await getNewsletterIssue(7, 'Pat'))?.oneOff).toBe(false);
  });
});

describe.each([
  ['broadcast', async (n: number) => (await renderNewsletterForBroadcast(n)).html],
  ['Liquid broadcast', async (n: number) => (await renderNewsletterForBroadcastWithHtml(n, DOC)).html],
  ['direct send', async (n: number) => (await getNewsletterHtml(n, subscriber, null, '#'))!],
])('%s email', (_name, render) => {
  it('has no masthead and no automatic library block for a one-off', async () => {
    vi.mocked(loadNewsletterIssue).mockResolvedValue(issue(true));
    const html = await render(10001);
    expect(html).not.toContain(MASTHEAD);
    expect(html).not.toContain(LIBRARY);
    expect(html).toContain(SIGNATURE);
  });

  it('keeps the masthead and the library block for a series issue', async () => {
    vi.mocked(loadNewsletterIssue).mockResolvedValue(issue(false));
    const html = await render(7);
    expect(html).toContain(MASTHEAD);
    expect(html).toContain(LIBRARY);
  });
});

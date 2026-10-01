import { describe, it, expect, beforeEach, vi } from 'vitest';
import { noteFragment, preheaderFragment } from '../lib/newsletter/chrome-fragments';
import { injectEmailChrome } from '../lib/newsletter/inject-chrome';

const DOC = '<html><head></head><body style="x"><table><tr><td>BODY CONTENT</td></tr></table></body></html>';

describe('noteFragment', () => {
  it('returns an empty string for blank input', () => {
    expect(noteFragment('')).toBe('');
    expect(noteFragment('  \n\n  ')).toBe('');
  });

  it('escapes HTML', () => {
    const html = noteFragment('<b>Hi</b> & "you"');
    expect(html).toContain('&lt;b&gt;Hi&lt;/b&gt; &amp; &quot;you&quot;');
    expect(html).not.toContain('<b>');
  });

  it('splits blank-line-separated paragraphs and keeps single line breaks', () => {
    const html = noteFragment('First line\nsecond line\n\nSecond paragraph');
    expect(html.match(/<p\b/g)).toHaveLength(2);
    expect(html).toContain('First line<br />second line');
    expect(html).toContain('Second paragraph');
  });
});

describe('preheaderFragment', () => {
  it('returns an empty string for blank input', () => {
    expect(preheaderFragment('')).toBe('');
    expect(preheaderFragment('   ')).toBe('');
  });

  it('renders hidden, escaped preview text', () => {
    const html = preheaderFragment('Both <are> true');
    expect(html).toContain('display:none');
    expect(html).toContain('Both &lt;are&gt; true');
  });
});

describe('injectEmailChrome', () => {
  it('places the preheader right after <body> and the note after the logo, before the body content', () => {
    const html = injectEmailChrome(DOC, {
      appUrl: 'https://example.com',
      unsubscribeUrl: '#',
      postscripts: [],
      preheader: 'PREVIEW TEXT',
      note: 'NOTE TEXT',
    });
    const bodyOpen = html.indexOf('<body');
    const preheader = html.indexOf('PREVIEW TEXT');
    const logo = html.indexOf('permission-slip.png');
    const note = html.indexOf('NOTE TEXT');
    const content = html.indexOf('BODY CONTENT');
    expect(bodyOpen).toBeGreaterThan(-1);
    expect(preheader).toBeGreaterThan(bodyOpen);
    expect(logo).toBeGreaterThan(preheader);
    expect(note).toBeGreaterThan(logo);
    expect(content).toBeGreaterThan(note);
  });

  it('injects neither when omitted', () => {
    const html = injectEmailChrome(DOC, { appUrl: 'https://example.com', unsubscribeUrl: '#', postscripts: [] });
    expect(html).not.toContain('display:none');
    expect(html).not.toContain('data-newsletter-note');
  });
});

vi.mock('../lib/resend/contacts', () => ({
  getResendClient: vi.fn(),
  ensureNeonIdProperty: vi.fn(),
  ensureChartContactProperties: vi.fn(),
}));
vi.mock('../lib/newsletter/email-loader', () => ({ getNewsletterIssue: vi.fn() }));
vi.mock('../lib/newsletter/loader', () => ({ loadNewsletterIssue: vi.fn() }));
vi.mock('../lib/newsletter/email', () => ({ getNewsletterSubject: vi.fn() }));
vi.mock('../lib/newsletter/resolve', () => ({ buildContactPropertyValues: vi.fn() }));
vi.mock('../lib/db', () => ({
  upsertContactSyncState: vi.fn(),
  getNewsletterNoteForDate: vi.fn(),
  getNextNewsletterNote: vi.fn(),
}));

describe('broadcast rendering', () => {
  beforeEach(async () => {
    const { getNewsletterIssue } = await import('../lib/newsletter/email-loader');
    const { loadNewsletterIssue } = await import('../lib/newsletter/loader');
    const { getNewsletterSubject } = await import('../lib/newsletter/email');
    vi.mocked(getNewsletterIssue).mockResolvedValue({
      number: 9,
      subject: 'Subject',
      preview: 'Issue preview',
      slug: null,
      bodyHtml: DOC,
      ps: [],
    });
    vi.mocked(loadNewsletterIssue).mockResolvedValue({
      number: 9,
      newsletterId: 1,
      subject: 'Hi {{firstName}}',
      preview: 'Preview for {{firstName}}',
      slug: null,
      description: '',
      oldSlugs: [],
      rawPs: [],
      bodyJson: null,
      bodyHtml: DOC,
      liquidSectionMap: null,
      updatedAt: new Date().toISOString(),
    });
    vi.mocked(getNewsletterSubject).mockResolvedValue('Subject');
  });

  it('renderNewsletterForBroadcast includes the issue preview and the note', async () => {
    const { renderNewsletterForBroadcast } = await import('../lib/resend/broadcasts');
    const { html } = await renderNewsletterForBroadcast(9, { note: 'Sorry I missed last week' });
    expect(html).toContain('Issue preview');
    expect(html).toContain('Sorry I missed last week');
  });

  it('renderNewsletterForBroadcast omits the note by default', async () => {
    const { renderNewsletterForBroadcast } = await import('../lib/resend/broadcasts');
    const { html } = await renderNewsletterForBroadcast(9);
    expect(html).toContain('Issue preview');
    expect(html).not.toContain('data-newsletter-note');
  });

  it('renderNewsletterForBroadcastWithHtml replaces variables in the preview and includes the note', async () => {
    const { renderNewsletterForBroadcastWithHtml } = await import('../lib/resend/broadcasts');
    const { html } = await renderNewsletterForBroadcastWithHtml(9, DOC, { note: 'A note' });
    expect(html).toContain('Preview for {{{FIRST_NAME|there}}}');
    expect(html).toContain('A note');
  });
});

describe('note lookup by send day', () => {
  it('matches the calendar day in the publication timezone, not UTC', async () => {
    const { getNewsletterNoteForDate: getForDate } = await import('../lib/db');
    vi.mocked(getForDate).mockResolvedValue(null);
    const { getNoteForSend } = await import('../lib/newsletter/notes');
    // 2026-10-08 02:00 UTC is still Oct 7 in Chicago
    await getNoteForSend(1, new Date('2026-10-08T02:00:00Z'), 'America/Chicago');
    expect(getForDate).toHaveBeenCalledWith(1, '2026-10-07');
  });

  it('looks for upcoming notes from today in the publication timezone', async () => {
    const { getNextNewsletterNote: getNext } = await import('../lib/db');
    vi.mocked(getNext).mockResolvedValue(null);
    const { getUpcomingNote } = await import('../lib/newsletter/notes');
    await getUpcomingNote(1, 'America/Chicago', new Date('2026-10-01T04:00:00Z'));
    expect(getNext).toHaveBeenCalledWith(1, '2026-09-30');
  });
});

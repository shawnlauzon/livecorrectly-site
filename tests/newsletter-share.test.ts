import { describe, it, expect } from 'vitest';
import { SHARE_COPY, SHARE_URL_VAR, shareHref, replaceShareUrl } from '@/lib/newsletter/share';
import { injectEmailChrome } from '@/lib/newsletter/inject-chrome';
import { extractDynamicSections, resolveNewsletterHtml } from '@/lib/newsletter/resolve';
import { resolveSubscriberLinks } from '@/lib/newsletter/email-loader';
import { validateLinkHref } from '@/app/admin/newsletters/[id]/[number]/link-href';
import { PRODUCTION_URL } from '@/lib/site-url';

const ID = '11111111-2222-3333-4444-555555555555';
const ISSUE_URL = `${PRODUCTION_URL}/newsletter/giving-thanks?utm_source=reader_share&utm_medium=referral&utm_campaign=newsletter_7`;

/** The address a mailto href opens with, decoded: { subject, body }. */
function decodeMailto(href: string): { subject: string; body: string } {
  expect(href.startsWith('mailto:?')).toBe(true);
  const params = new URLSearchParams(href.slice('mailto:?'.length).replace(/&amp;/g, '&'));
  return { subject: params.get('subject') ?? '', body: params.get('body') ?? '' };
}

const hrefIn = (html: string) => html.match(/href="(mailto:[^"]*)"/)?.[1] ?? '';

describe('shareHref', () => {
  it('opens a new email with the share subject and the issue link', () => {
    const { subject, body } = decodeMailto(shareHref({ slug: 'giving-thanks', newsletterNumber: 7 }));
    expect(subject).toBe(SHARE_COPY.emailSubject);
    expect(body).toBe(`${SHARE_COPY.emailBody}\n\n${ISSUE_URL}`);
  });

  it('never carries the subscriber, so a friend gets the public page', () => {
    const href = shareHref({ slug: 'giving-thanks', newsletterNumber: 7 });
    expect(decodeURIComponent(href)).not.toContain('?s=');
    expect(decodeURIComponent(href)).not.toContain('utm_medium=email');
  });

  it('shares the newsletter index when the issue is not on the web', () => {
    const { body } = decodeMailto(shareHref({ slug: null, newsletterNumber: 7 }));
    expect(body).toContain(`${PRODUCTION_URL}/newsletter?utm_source=reader_share&utm_medium=referral&utm_campaign=newsletter_7`);
  });

  it('is safe inside an HTML attribute', () => {
    const href = shareHref({ slug: 'giving-thanks', newsletterNumber: 7 });
    expect(href).not.toMatch(/&(?!amp;)/);
    expect(href).not.toContain('"');
    expect(href).not.toContain(' ');
  });
});

describe('{{share_url}} as a link address', () => {
  const LINK = `<p>Pass it on: <a href="{{${SHARE_URL_VAR}}}">send this to a friend</a>.</p>`;
  const issue = { slug: 'giving-thanks', newsletterNumber: 7 };

  it('is accepted by the editor link field', () => {
    expect(validateLinkHref('{{share_url}}', false)).toBe('{{share_url}}');
    expect(validateLinkHref('  {{ share_url }} ', false)).toBe('{{share_url}}');
  });

  it('resolves to the share link, keeping the words', () => {
    const out = replaceShareUrl(LINK, issue);
    expect(out).toContain('>send this to a friend</a>');
    expect(decodeMailto(hrefIn(out)).body).toContain(ISSUE_URL);
    expect(out).not.toContain('share_url');
  });

  it('tolerates spaces inside the braces and replaces every occurrence', () => {
    const out = replaceShareUrl(LINK + '<a href="{{ share_url }}">x</a>', issue);
    expect(out.match(/href="mailto:/g)).toHaveLength(2);
  });

  it('resolves in emails sent to a subscriber', () => {
    const out = resolveSubscriberLinks(LINK, { subscriberId: ID, ...issue });
    expect(decodeMailto(hrefIn(out)).body).toContain(ISSUE_URL);
  });

  it('resolves on the web and in the editor preview', async () => {
    for (const mode of ['web', 'email'] as const) {
      const out = await resolveNewsletterHtml(LINK, { mode, subscriberId: ID, ...issue });
      expect(decodeMailto(hrefIn(out)).body).toContain(ISSUE_URL);
    }
  });

  it('survives broadcast extraction instead of becoming a contact property', () => {
    const { broadcastTemplate } = extractDynamicSections(LINK, 7, 1, null);
    expect(broadcastTemplate).toContain('href="{{share_url}}"');
    expect(broadcastTemplate).not.toContain('contact.share_url');
  });
});

describe('automatic share line in the email', () => {
  const DOC = '<html><head></head><body style="x"><table><tr><td>BODY CONTENT</td></tr></table></body></html>';
  const base = { appUrl: 'https://example.com', unsubscribeUrl: 'https://example.com/unsub', postscripts: ['A POSTSCRIPT'] };

  it('appears after the article, signature and postscripts, above the footer', () => {
    const html = injectEmailChrome(DOC, { ...base, share: { slug: 'giving-thanks', newsletterNumber: 7 } });
    const share = html.indexOf(SHARE_COPY.link);
    expect(html).toContain(SHARE_COPY.line);
    expect(share).toBeGreaterThan(html.indexOf('BODY CONTENT'));
    expect(share).toBeGreaterThan(html.indexOf('Shawn Lauzon'));
    expect(share).toBeGreaterThan(html.indexOf('A POSTSCRIPT'));
    expect(share).toBeLessThan(html.indexOf('Unsubscribe'));
  });

  it('links to the share email for this issue', () => {
    const html = injectEmailChrome(DOC, { ...base, share: { slug: 'giving-thanks', newsletterNumber: 7 } });
    expect(decodeMailto(hrefIn(html)).body).toContain(ISSUE_URL);
  });

  it('is left out when the issue has no web page to share', () => {
    const html = injectEmailChrome(DOC, { ...base, share: { slug: null, newsletterNumber: 7 } });
    expect(html).not.toContain(SHARE_COPY.link);
  });

  it('is left out when not asked for', () => {
    expect(injectEmailChrome(DOC, base)).not.toContain(SHARE_COPY.link);
  });
});

describe('Share link slash command', () => {
  it('inserts the share words as a link to {{share_url}}', async () => {
    const { shareLinkContent, SHARE_LINK } = await import('@/app/admin/newsletters/[id]/[number]/share-link-command');
    expect(shareLinkContent()).toEqual({
      type: 'text',
      text: SHARE_COPY.link,
      marks: [{ type: 'link', attrs: { href: '{{share_url}}' } }],
    });
    expect(SHARE_LINK.category).toBe('Content blocks');
  });
});

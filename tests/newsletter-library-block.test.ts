import { describe, it, expect } from 'vitest';
import {
  LIBRARY_BLOCK_COPY,
  LIBRARY_BLOCK_TOKEN,
  replaceLibraryBlock,
} from '@/lib/newsletter/library-block';
import { resolveNewsletterHtml } from '@/lib/newsletter/resolve';
import { resolveSubscriberLinks } from '@/lib/newsletter/email-loader';
import { SAMPLE_CHART } from '@/lib/newsletter/sample-chart';
import { PRODUCTION_URL } from '@/lib/site-url';

const ID = '11111111-2222-3333-4444-555555555555';

// Same shape the editor writes for a plain paragraph (see newsletter_issues.body_html)
const EDITOR_PARAGRAPH = `<p
                      style="margin:0;padding:0;font-size:1em">
                      ${LIBRARY_BLOCK_TOKEN}
                    </p>`;

const html = (body: string) => `<p>Before</p>${body}<p>After</p>`;

describe('replaceLibraryBlock', () => {
  it('replaces the token paragraph with the block in email mode', () => {
    const out = replaceLibraryBlock(html(EDITOR_PARAGRAPH), ID, 7, 'email');
    expect(out).not.toContain(LIBRARY_BLOCK_TOKEN);
    expect(out).toContain(LIBRARY_BLOCK_COPY.heading);
    expect(out).toContain(LIBRARY_BLOCK_COPY.body);
    expect(out).toContain(LIBRARY_BLOCK_COPY.button);
    expect(out.startsWith('<p>Before</p><table')).toBe(true);
    expect(out.endsWith('</table><p>After</p>')).toBe(true);
  });

  it('links to the newsletter index with the subscriber id and email UTMs', () => {
    const out = replaceLibraryBlock(EDITOR_PARAGRAPH, ID, 7, 'email');
    expect(out).toContain(
      `href="${PRODUCTION_URL}/newsletter?s=${ID}&utm_source=livecorrectly&utm_medium=email&utm_campaign=newsletter_7"`,
    );
  });

  it('keeps a Resend placeholder id intact for broadcasts', () => {
    const out = replaceLibraryBlock(EDITOR_PARAGRAPH, '{{{contact.neon_id}}}', 7, 'email');
    expect(out).toContain('/newsletter?s={{{contact.neon_id}}}&');
  });

  it('strips the token paragraph in web mode', () => {
    expect(replaceLibraryBlock(html(EDITOR_PARAGRAPH), ID, 7, 'web')).toBe(
      '<p>Before</p><p>After</p>',
    );
  });

  it('strips the token paragraph when there is no subscriber id', () => {
    expect(replaceLibraryBlock(html(EDITOR_PARAGRAPH), undefined, 7, 'email')).toBe(
      '<p>Before</p><p>After</p>',
    );
  });

  it('replaces every occurrence', () => {
    const out = replaceLibraryBlock(EDITOR_PARAGRAPH + EDITOR_PARAGRAPH, ID, 7, 'email');
    expect(out.match(/<table/g)).toHaveLength(2);
  });
});

describe('resolveNewsletterHtml with the library block', () => {
  it('survives Liquid and renders in email mode', async () => {
    const out = await resolveNewsletterHtml(html(EDITOR_PARAGRAPH), {
      chart: SAMPLE_CHART,
      mode: 'email',
      subscriberId: ID,
      newsletterNumber: 7,
    });
    expect(out).toContain(`/newsletter?s=${ID}&`);
    expect(out).not.toContain(LIBRARY_BLOCK_TOKEN);
  });

  it('is stripped in web mode', async () => {
    const out = await resolveNewsletterHtml(html(EDITOR_PARAGRAPH), {
      chart: SAMPLE_CHART,
      mode: 'web',
      subscriberId: ID,
      newsletterNumber: 7,
    });
    expect(out).not.toContain(LIBRARY_BLOCK_TOKEN);
    expect(out).not.toContain(LIBRARY_BLOCK_COPY.heading);
  });
});

describe('resolveSubscriberLinks', () => {
  it('resolves the library block and relative links together', () => {
    const body = `${EDITOR_PARAGRAPH}<p><a href="/lunar-cycle" data-relative="true">Your cycle</a></p>`;
    const out = resolveSubscriberLinks(body, {
      subscriberId: '{{{contact.neon_id}}}',
      slug: 'issue-seven',
      newsletterNumber: 7,
    });
    expect(out).toContain('/newsletter?s={{{contact.neon_id}}}&');
    expect(out).toContain(
      `href="${PRODUCTION_URL}/see-your-design/{{{contact.neon_id}}}/lunar-cycle?utm_source=livecorrectly&utm_medium=email&utm_campaign=newsletter_7"`,
    );
    expect(out).not.toContain('data-relative');
  });
});

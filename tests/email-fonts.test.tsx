import { describe, it, expect } from 'vitest';
import * as React from 'react';
import { render } from 'react-email';
import { ChartLink } from '@/emails/chart-link';
import { EmailLayout } from '@/emails/components/email-layout';
import { injectEmailChrome } from '../lib/newsletter/inject-chrome';
import { EMAIL_BODY_FONT, EMAIL_FONTS_HREF, EMAIL_HEADING_FONT } from '../lib/email/fonts';

// Matches the outer content cell composeReactEmail() writes (editor "basic" theme).
const EDITOR_DOC =
  '<html><head></head><body style="x"><table><tr>' +
  '<td dir="ltr" style="font-family:-apple-system, BlinkMacSystemFont, &#x27;Segoe UI&#x27;, &#x27;Roboto&#x27;, &#x27;Helvetica Neue&#x27;, sans-serif;font-size:1em;line-height:155%">' +
  '<h1 style="margin:0">Title</h1><p>BODY CONTENT</p></td></tr></table></body></html>';

const STALE_FONTS = ['Hanken Grotesk', 'Bricolage', 'Newsreader', 'BlinkMacSystemFont'];

function renderNewsletter() {
  return injectEmailChrome(EDITOR_DOC, {
    unsubscribeUrl: 'https://example.com/u',
    postscripts: ['A postscript'],
    note: 'A dated note',
    library: { subscriberId: 'sub-1', newsletterNumber: 3 },
  });
}

describe('newsletter fonts', () => {
  it('loads both brand fonts', () => {
    expect(renderNewsletter()).toContain(EMAIL_FONTS_HREF);
  });

  it('sets the issue body in Karla', () => {
    expect(renderNewsletter()).toContain(`font-family:${EMAIL_BODY_FONT};font-size:16px`);
  });

  it('sets headings, including the library heading, in Fraunces', () => {
    const html = renderNewsletter();
    expect(html).toMatch(new RegExp(`<h1 style="font-family:${EMAIL_HEADING_FONT};[^"]*margin:0">`));
    expect(html).toMatch(new RegExp(`font-family:${EMAIL_HEADING_FONT};[^"]*">Your newsletter library`));
  });

  it('uses no font the site does not load', () => {
    const html = renderNewsletter();
    for (const font of STALE_FONTS) expect(html).not.toContain(font);
  });
});

describe('React email fonts', () => {
  const cases = {
    'welcome layout': <EmailLayout preview="p" unsubscribeUrl="https://example.com/u">Hello</EmailLayout>,
    'chart link': <ChartLink firstName="Pat" newsletterUrl="https://example.com/n" chartUrl="https://example.com/c" />,
  };

  for (const [name, element] of Object.entries(cases)) {
    it(`${name} loads the brand fonts and sets the body in Karla`, async () => {
      const html = await render(element);
      expect(html).toContain(EMAIL_FONTS_HREF.replaceAll('&', '&amp;'));
      // React escapes quotes in attributes.
      expect(html).toContain(`font-family:${EMAIL_BODY_FONT.replaceAll("'", '&#x27;')}`);
    });
  }
});

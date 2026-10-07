import { describe, it, expect } from 'vitest';
import * as React from 'react';
import { render, Tailwind } from 'react-email';
import { ChartLink } from '@/emails/chart-link';
import { EmailLayout } from '@/emails/components/email-layout';
import { CareerTypeHighlight } from '@/emails/components/career-type-table';
import { RaQuote } from '@/emails/components/ra-quote';
import { injectEmailChrome } from '../lib/newsletter/inject-chrome';
import { EMAIL_BODY_FONT, EMAIL_HEADING_FONT } from '../lib/email/fonts';

// Matches the outer content cell composeReactEmail() writes (editor "basic" theme),
// plus a heading saved while the editor theme still named Fraunces.
const EDITOR_DOC =
  '<html><head></head><body style="x"><table><tr>' +
  '<td dir="ltr" style="font-family:-apple-system, BlinkMacSystemFont, &#x27;Segoe UI&#x27;, &#x27;Roboto&#x27;, &#x27;Helvetica Neue&#x27;, sans-serif;font-size:1em;line-height:155%">' +
  '<h1 style="margin:0">Title</h1>' +
  '<h2 style="margin:0;font-weight:600;font-family:&#x27;Fraunces&#x27;, Georgia, serif">Saved heading</h2>' +
  '<p>BODY CONTENT</p></td></tr></table></body></html>';

// Fonts email clients may not have: every email uses Georgia headings and
// Helvetica body text, so all readers see the same thing.
const NOT_IN_EMAIL = ['Fraunces', 'Karla', 'Hanken Grotesk', 'Bricolage', 'Newsreader', 'BlinkMacSystemFont', 'fonts.googleapis.com'];

function renderNewsletter() {
  return injectEmailChrome(EDITOR_DOC, {
    unsubscribeUrl: 'https://example.com/u',
    postscripts: ['A postscript'],
    note: 'A dated note',
    library: { subscriberId: 'sub-1', newsletterNumber: 3 },
  });
}

describe('newsletter fonts', () => {
  it('sets the issue body in Helvetica', () => {
    expect(renderNewsletter()).toContain(`font-family:${EMAIL_BODY_FONT};font-size:16px`);
  });

  it('sets headings, including saved ones and the library heading, in Georgia', () => {
    const html = renderNewsletter();
    expect(html).toMatch(new RegExp(`<h1 style="font-family:${EMAIL_HEADING_FONT};[^"]*margin:0">`));
    expect(html).toMatch(new RegExp(`<h2 style="[^"]*font-family:${EMAIL_HEADING_FONT}[^"]*">Saved heading`));
    expect(html).toMatch(new RegExp(`font-family:${EMAIL_HEADING_FONT};[^"]*">Your newsletter library`));
  });

  it('uses no web font or font a client may lack', () => {
    const html = renderNewsletter();
    for (const font of NOT_IN_EMAIL) expect(html).not.toContain(font);
  });
});

describe('React email fonts', () => {
  const cases = {
    'welcome layout': <EmailLayout preview="p" unsubscribeUrl="https://example.com/u">Hello</EmailLayout>,
    'chart link': <ChartLink firstName="Pat" newsletterUrl="https://example.com/n" chartUrl="https://example.com/c" />,
  };

  for (const [name, element] of Object.entries(cases)) {
    it(`${name} sets the body in Helvetica and loads no web font`, async () => {
      const html = await render(element);
      expect(html).toContain(`font-family:${EMAIL_BODY_FONT}`);
      for (const font of NOT_IN_EMAIL) expect(html).not.toContain(font);
    });
  }

  const serifParts = {
    'career type highlight': <CareerTypeHighlight number="1" title="Builder" description="d" />,
    'Ra quote': <RaQuote>Love yourself</RaQuote>,
  };

  for (const [name, element] of Object.entries(serifParts)) {
    it(`${name} uses Georgia, not the platform serif`, async () => {
      // Tailwind wrapper so className styles inline as they do inside EmailLayout.
      const html = await render(<Tailwind>{element}</Tailwind>);
      expect(html).toContain(`font-family:${EMAIL_HEADING_FONT}`);
      expect(html).not.toContain('ui-serif');
    });
  }
});

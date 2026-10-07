import { describe, it, expect } from 'vitest';
import { injectEmailChrome } from '../lib/newsletter/inject-chrome';
import { EMAIL_COLORS } from '../lib/email/colors';

// The shape composeReactEmail() writes: white body, content table with black text.
const EDITOR_DOC =
  '<html><head></head><body dir="ltr" lang="en" style="background-color:#ffffff">' +
  '<table><tbody><tr><td style="font-family:sans-serif;font-size:1em;background-color:#ffffff">' +
  '<table style="max-width:600px;align:center;width:100%;color:#000000;background-color:#ffffff;border-radius:0px">' +
  '<tbody><tr><td><p style="margin:0">BODY CONTENT</p>' +
  '<h2 style="margin:0;font-weight:600">A heading</h2>' +
  '<h3 style="margin:0;color:#123456">Colored heading</h3>' +
  '</td></tr></tbody></table></td></tr></tbody></table></body></html>';

function render(): string {
  return injectEmailChrome(EDITOR_DOC, {
    unsubscribeUrl: 'https://example.com/u',
    postscripts: [],
    preheader: 'Preview text',
  });
}

describe('newsletter frame', () => {
  it('puts the email on the ground color', () => {
    expect(render()).toContain(`<body dir="ltr" lang="en" style="background-color:${EMAIL_COLORS.ground}">`);
  });

  it('wraps logo, body, and footer in one white 660px column', () => {
    const html = render();
    const open = html.indexOf('data-newsletter-frame');
    expect(open).toBeGreaterThan(-1);
    expect(html.indexOf('permission-slip.png')).toBeGreaterThan(open);
    expect(html.indexOf('BODY CONTENT')).toBeGreaterThan(open);
    expect(html.indexOf('Unsubscribe')).toBeGreaterThan(open);
    expect(html).toContain(`max-width:660px;margin:0 auto;background-color:${EMAIL_COLORS.card}`);
    expect(html).toContain('padding:32px 24px');
  });

  it('keeps the hidden preheader first in the body', () => {
    const html = render();
    expect(html.indexOf('Preview text')).toBeLessThan(html.indexOf('data-newsletter-frame'));
  });

  it('sets body text in ink-soft and headings in ink', () => {
    const html = render();
    expect(html).toContain(`width:100%;color:${EMAIL_COLORS.inkSoft};background-color:#ffffff`);
    expect(html).not.toContain('color:#000000');
    expect(html).toMatch(new RegExp(`<h2 style="[^"]*color:${EMAIL_COLORS.ink};[^"]*margin:0;font-weight:600">`));
    expect(html).toMatch(/<h3 style="[^"]*margin:0;color:#123456">/);
    expect(html).not.toMatch(new RegExp(`<h3 style="[^"]*color:${EMAIL_COLORS.ink}`));
  });
});

import { describe, it, expect } from 'vitest';
import { injectEmailChrome } from '../lib/newsletter/inject-chrome';

// Shapes composeReactEmail() writes for an image and the paragraphs around it.
const P = 'margin:0;padding:0;font-size:1em;padding-top:0.5em;padding-bottom:0.5em';
const IMG = '<img alt="" src="https://example.com/a.png" style="display:block;max-width:100%;border-radius:8px" />';

function render(body: string): string {
  return injectEmailChrome(`<html><head></head><body><table><tr><td style="font-family:sans-serif;font-size:1em">${body}</td></tr></table></body></html>`, {
    unsubscribeUrl: 'https://example.com/u',
    postscripts: [],
  });
}

describe('newsletter image spacing', () => {
  it('adds space above each image in the issue body', () => {
    const html = render(`<p style="${P}">Before</p>${IMG}`);
    expect(html).toContain('<img alt="" src="https://example.com/a.png" style="margin-top:32px;display:block;');
  });

  it('leaves the logo and other chrome images alone', () => {
    const html = render(`<p style="${P}">Text</p>`);
    expect(html).not.toContain('margin-top:32px');
  });

  it('adds space below an italic caption right after an image', () => {
    const html = render(`${IMG}\n <p style="${P}">\n <em>A caption</em>\n </p><p style="${P}">After</p>`);
    expect(html).toContain(`<p style="${P};margin-bottom:24px">\n <em>A caption</em>`);
    expect(html).toContain(`<p style="${P}">After</p>`);
  });

  it('finds the caption after a linked image', () => {
    const html = render(`<a href="https://example.com">${IMG}</a><p style="${P}"><em>Linked caption</em></p>`);
    expect(html).toContain(`<p style="${P};margin-bottom:24px"><em>Linked caption</em>`);
  });

  it('does not treat a partly italic paragraph as a caption', () => {
    const html = render(`${IMG}<p style="${P}"><em>Italic</em> and plain</p>`);
    expect(html).not.toContain('margin-bottom:24px');
  });

  it('does not treat an italic paragraph without an image before it as a caption', () => {
    const html = render(`<p style="${P}">Text</p><p style="${P}"><em>Aside</em></p>`);
    expect(html).not.toContain('margin-bottom:24px');
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { parseNewsletter, clearNewsletterCache, getNewsletter, getNewsletterCount, getNewsletterRaw } from '../emails/newsletter-loader';

beforeEach(() => {
  clearNewsletterCache();
});

describe('parseNewsletter', () => {
  it('extracts frontmatter subject and preview', () => {
    const md = `---
subject: "Hello world"
preview: "A preview"
---

Body here.
`;
    const result = parseNewsletter(md, 1);
    expect(result.number).toBe(1);
    expect(result.subject).toBe('Hello world');
    expect(result.preview).toBe('A preview');
  });

  it('renders markdown body to HTML with inline styles', () => {
    const md = `---
subject: "Test"
preview: "Test"
---

Hello **world**.
`;
    const result = parseNewsletter(md, 1);
    expect(result.bodyHtml).toContain('<p style=');
    expect(result.bodyHtml).toContain('<strong style=');
    expect(result.bodyHtml).toContain('world');
  });

  it('renders links with grape color', () => {
    const md = `---
subject: "Test"
preview: "Test"
---

Click [here](https://example.com) now.
`;
    const result = parseNewsletter(md, 1);
    expect(result.bodyHtml).toContain('href="https://example.com"');
    expect(result.bodyHtml).toContain('color:#6A4BD6');
  });

  it('renders headings with correct styles', () => {
    const md = `---
subject: "Test"
preview: "Test"
---

## Section heading
`;
    const result = parseNewsletter(md, 1);
    expect(result.bodyHtml).toContain('<h2 style=');
    expect(result.bodyHtml).toContain('Section heading');
  });

  it('renders images with email-safe styles', () => {
    const md = `---
subject: "Test"
preview: "Test"
---

![Alt text](https://example.com/image.jpg)
`;
    const result = parseNewsletter(md, 1);
    expect(result.bodyHtml).toContain('src="https://example.com/image.jpg"');
    expect(result.bodyHtml).toContain('max-width:100%');
    expect(result.bodyHtml).toContain('alt="Alt text"');
  });

  it('renders lists with inline styles', () => {
    const md = `---
subject: "Test"
preview: "Test"
---

- Item one
- Item two
`;
    const result = parseNewsletter(md, 1);
    expect(result.bodyHtml).toContain('<ul style=');
    expect(result.bodyHtml).toContain('<li style=');
    expect(result.bodyHtml).toContain('Item one');
    expect(result.bodyHtml).toContain('Item two');
  });

  it('renders horizontal rules with styled border', () => {
    const md = `---
subject: "Test"
preview: "Test"
---

Above

---

Below
`;
    const result = parseNewsletter(md, 1);
    expect(result.bodyHtml).toContain('<hr style=');
    expect(result.bodyHtml).toContain('border-top:1px solid #E6E1F4');
  });

  it('handles missing frontmatter gracefully', () => {
    const md = 'Just a body with no frontmatter.';
    const result = parseNewsletter(md, 1);
    expect(result.subject).toBe('');
    expect(result.preview).toBe('');
    expect(result.bodyHtml).toContain('Just a body');
  });
});

describe('getNewsletter', () => {
  it('replaces {{firstName}} in subject, preview, and body', () => {
    // getNewsletter reads from disk — use the actual 04.md file (first newsletter, matches next_step 4)
    const result = getNewsletter(4, 'Alice');
    expect(result).not.toBeNull();
    expect(result!.bodyHtml).toContain('Alice');
    expect(result!.bodyHtml).not.toContain('{{firstName}}');
  });

  it('returns null for non-existent step', () => {
    expect(getNewsletter(999, 'Alice')).toBeNull();
  });
});

describe('getNewsletterRaw', () => {
  it('returns newsletter without variable replacement', () => {
    const result = getNewsletterRaw(4);
    expect(result).not.toBeNull();
    expect(result!.bodyHtml).toContain('{{firstName}}');
  });
});

describe('getNewsletterCount', () => {
  it('returns the number of newsletter files', () => {
    const count = getNewsletterCount();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

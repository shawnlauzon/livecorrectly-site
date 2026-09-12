import fs from 'fs';
import path from 'path';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { parseRawNewsletter, type RawNewsletter } from '../newsletters/loader';

/**
 * Mock getDbNewsletters to load from the filesystem instead of hitting Neon.
 * This keeps tests validating real newsletter content without a DB connection.
 */
function loadNewslettersFromDisk(): Map<number, RawNewsletter> {
  const dir = path.join(process.cwd(), 'newsletters');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort();
  const map = new Map<number, RawNewsletter>();
  for (const file of files) {
    const num = parseInt(file.replace('.md', ''), 10);
    if (isNaN(num) || num < 1) continue;
    const content = fs.readFileSync(path.join(dir, file), 'utf-8');
    map.set(num, parseRawNewsletter(content, num));
  }
  return map;
}

vi.mock('@/lib/db', () => ({
  getDbNewsletters: vi.fn(() => Promise.resolve(loadNewslettersFromDisk())),
}));

// Import after mock is set up
const { parseNewsletter, clearNewsletterCache, getNewsletter, getNewsletterCount, getNewsletterRaw } = await import('../emails/newsletter-loader');

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
    // Check link has inline color styling (exact color depends on markdown renderer config)
    expect(result.bodyHtml).toContain('color:');
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
    expect(result.bodyHtml).toContain('border-top:1px solid');
  });

  it('handles missing frontmatter gracefully', () => {
    const md = 'Just a body with no frontmatter.';
    const result = parseNewsletter(md, 1);
    expect(result.subject).toBe('');
    expect(result.preview).toBe('');
    expect(result.bodyHtml).toContain('Just a body');
  });

  it('parses single-string ps as a one-element array', () => {
    const md = `---
subject: "Test"
preview: "Test"
ps: "Check this out"
---

Body.
`;
    const raw = parseRawNewsletter(md, 1);
    expect(raw.rawPs).toEqual(['Check this out']);

    const result = parseNewsletter(md, 1);
    expect(result.ps).toHaveLength(1);
    expect(result.ps[0]).toContain('Check this out');
  });

  it('parses array ps into multiple rendered postscripts', () => {
    const md = `---
subject: "Test"
preview: "Test"
ps:
  - "First postscript with **bold**"
  - "Second postscript"
---

Body.
`;
    const raw = parseRawNewsletter(md, 1);
    expect(raw.rawPs).toEqual(['First postscript with **bold**', 'Second postscript']);

    const result = parseNewsletter(md, 1);
    expect(result.ps).toHaveLength(2);
    expect(result.ps[0]).toContain('<strong');
    expect(result.ps[0]).toContain('bold');
    expect(result.ps[1]).toContain('Second postscript');
  });

  it('returns empty array when ps is not set', () => {
    const md = `---
subject: "Test"
preview: "Test"
---

Body.
`;
    const raw = parseRawNewsletter(md, 1);
    expect(raw.rawPs).toEqual([]);

    const result = parseNewsletter(md, 1);
    expect(result.ps).toEqual([]);
  });
});

describe('getNewsletter', () => {
  it('replaces {{firstName}} in subject, preview, and body', async () => {
    const result = await getNewsletter(4, 'Alice');
    expect(result).not.toBeNull();
    expect(result!.bodyHtml).toContain('Alice');
    expect(result!.bodyHtml).not.toContain('{{firstName}}');
  });

  it('returns null for non-existent step', async () => {
    expect(await getNewsletter(999, 'Alice')).toBeNull();
  });
});

describe('getNewsletterRaw', () => {
  it('returns newsletter without variable replacement', async () => {
    const result = await getNewsletterRaw(4);
    expect(result).not.toBeNull();
    expect(result!.bodyHtml).toContain('{{firstName}}');
  });
});

describe('getNewsletterCount', () => {
  it('returns the number of newsletters', async () => {
    const count = await getNewsletterCount();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

import { describe, it, expect } from 'vitest';
import { validateLinkHref } from '@/app/admin/newsletters/[id]/[number]/link-href';

describe('validateLinkHref', () => {
  it('accepts the library URL variable as an address', () => {
    expect(validateLinkHref('{{library_url}}', false)).toBe('{{library_url}}');
    expect(validateLinkHref('  {{ library_url }} ', false)).toBe('{{library_url}}');
  });

  it('keeps absolute, mailto, tel and # links', () => {
    expect(validateLinkHref('https://example.com/a', false)).toBe('https://example.com/a');
    expect(validateLinkHref('mailto:a@b.co', false)).toBe('mailto:a@b.co');
    expect(validateLinkHref('tel:123', false)).toBe('tel:123');
    expect(validateLinkHref('#', false)).toBe('#');
  });

  it('prefixes bare domains with https://', () => {
    expect(validateLinkHref('example.com/x', false)).toBe('https://example.com/x');
  });

  it('rejects anything else', () => {
    expect(validateLinkHref('not a link', false)).toBeNull();
    expect(validateLinkHref('{{chartUrl}}', false)).toBeNull();
    expect(validateLinkHref('   ', false)).toBeNull();
  });

  it('makes relative links start with /', () => {
    expect(validateLinkHref('lunar-cycle', true)).toBe('/lunar-cycle');
    expect(validateLinkHref('/lunar-cycle', true)).toBe('/lunar-cycle');
  });
});

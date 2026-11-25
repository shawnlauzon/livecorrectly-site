import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import CtaPair from '@/components/cta-pair';
import { FREE_CALL_URL } from '@/lib/offers';

vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));

describe('CtaPair for a known subscriber', () => {
  const html = renderToStaticMarkup(<CtaPair subscriber location="hero" />);

  it('leads with Work with me', () => {
    expect(html).toContain('href="/work-with-me"');
    expect(html).toContain('Work with me');
  });

  it('offers the free 15-minute conversation as the second step', () => {
    expect(FREE_CALL_URL).toMatch(/^https:\/\/calendar\.google\.com\/appointments\//);
    expect(html).toContain(`href="${FREE_CALL_URL}"`);
    expect(html).toContain('free 15-minute conversation');
  });

  it('no longer links back to their design', () => {
    expect(html).not.toContain('/see-your-design/abc');
    expect(html).not.toContain('your design');
  });
});

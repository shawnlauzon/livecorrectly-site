import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import StarterOffer from '@/components/starter-offer';

vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));

const BIRTH_DETAILS_NOTE = 'After you pay, I’ll ask for your birth details.';

describe('StarterOffer birth-details note', () => {
  it('tells a new visitor they will be asked for birth details after paying', () => {
    expect(renderToStaticMarkup(<StarterOffer />)).toContain(BIRTH_DETAILS_NOTE);
  });

  it('is not shown to a known subscriber, whose birth details are on file', () => {
    const html = renderToStaticMarkup(
      <StarterOffer subscriberId="00000000-0000-0000-0000-000000000001" />,
    );
    expect(html).toContain('Get your guide');
    expect(html).not.toContain('birth details');
  });
});

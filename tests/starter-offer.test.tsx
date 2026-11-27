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

describe('StarterOffer during Black Friday', () => {
  it.each([
    ['a subscriber', '00000000-0000-0000-0000-000000000001'],
    ['a new visitor', undefined],
  ])('tells %s the conversation version costs the same as the guide alone', async (_who, id) => {
    const { BLACK_FRIDAY, STARTER, findOffer } = await import('@/lib/offers');
    const html = renderToStaticMarkup(<StarterOffer subscriberId={id} />);
    expect(BLACK_FRIDAY.price).toBe(STARTER.price);
    expect(html).toContain('Black Friday sale');
    expect(html).toContain('One conversation includes the guide, for the same price.');
    expect(html).toMatch(/Through (<!-- -->)?Cyber Monday/);
    // The normal price is struck through next to the sale price
    expect(html).toMatch(
      new RegExp(`<s[^>]*>\\$${findOffer('guided')!.price}</s> \\$${BLACK_FRIDAY.price}`),
    );
  });
});

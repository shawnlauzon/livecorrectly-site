// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { track } from '@/lib/analytics';
import OfferLink from '@/app/(public)/work-with-me/OfferLink';

vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.mocked(track).mockClear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function clickLink(element: React.ReactElement) {
  act(() => root.render(element));
  const link = container.querySelector('a')!;
  // Stop happy-dom from trying to navigate to the external href.
  link.addEventListener('click', (e) => e.preventDefault(), { capture: true });
  act(() => {
    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });
}

describe('OfferLink tracking', () => {
  it('fires begin_checkout, not book_offer_click, when given checkout details', () => {
    clickLink(
      <OfferLink
        href="https://buy.stripe.com/x"
        offerId="guided"
        checkout={{ name: 'Guided', price: 97 }}
      >
        Pay
      </OfferLink>,
    );
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('begin_checkout', {
      currency: 'USD',
      value: 97,
      items: [{ item_id: 'guided', item_name: 'Guided', price: 97 }],
      location: 'work_with_me',
    });
  });

  it('still fires book_offer_click without checkout details', () => {
    clickLink(
      <OfferLink href="https://example.com/book" offerId="guided">
        Book
      </OfferLink>,
    );
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('book_offer_click', {
      location: 'work_with_me',
      offer: 'guided',
    });
  });
});

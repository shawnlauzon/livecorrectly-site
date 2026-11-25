// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { track } from '@/lib/analytics';
import OfferPurchase from '@/components/offer-purchase';

vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  vi.mocked(track).mockClear();
  window.sessionStorage.clear();
});

describe('OfferPurchase', () => {
  it('records the GA4 purchase once per session id, however often it mounts', () => {
    const offer = { id: 'guided', name: 'Guided', price: 97 };
    for (let i = 0; i < 2; i++) {
      const container = document.createElement('div');
      const root = createRoot(container);
      act(() => root.render(<OfferPurchase sessionId="cs_test_abc" offer={offer} />));
      act(() => root.unmount());
    }
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('purchase', {
      transaction_id: 'cs_test_abc',
      currency: 'USD',
      value: 97,
      items: [{ item_id: 'guided', item_name: 'Guided', price: 97 }],
    });
  });
});

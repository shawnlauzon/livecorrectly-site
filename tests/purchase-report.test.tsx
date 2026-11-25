// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { track } from '@/lib/analytics';
import PurchaseReport from '@/components/purchase-report';

vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const fetchMock = vi.fn(() => Promise.resolve(new Response('{}')));
const item = { id: 'guided', name: 'Guided', price: 97 };
const subscriberId = '11111111-1111-4111-8111-111111111111';

function mountTwice(element: React.ReactElement) {
  for (let i = 0; i < 2; i++) {
    const root = createRoot(document.createElement('div'));
    act(() => root.render(element));
    act(() => root.unmount());
  }
}

beforeEach(() => {
  vi.mocked(track).mockClear();
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
  window.sessionStorage.clear();
});

describe('PurchaseReport', () => {
  it('records the GA4 purchase and reports it once per session id, however often it mounts', () => {
    mountTwice(
      <PurchaseReport sessionId="cs_test_abc" item={item} subscriberId={subscriberId} offerId="guided" />,
    );
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('purchase', {
      transaction_id: 'cs_test_abc',
      currency: 'USD',
      value: 97,
      items: [{ item_id: 'guided', item_name: 'Guided', price: 97 }],
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/guide/purchase');
    expect(JSON.parse(init.body as string)).toEqual({
      session_id: 'cs_test_abc',
      subscriber_id: subscriberId,
      offer_id: 'guided',
    });
  });

  it('does not report to the server without a subscriber id', () => {
    mountTwice(<PurchaseReport sessionId="cs_test_abc" item={item} offerId="guided" />);
    expect(track).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('omits offer_id for the guide', () => {
    mountTwice(<PurchaseReport sessionId="cs_test_abc" item={item} subscriberId={subscriberId} />);
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({
      session_id: 'cs_test_abc',
      subscriber_id: subscriberId,
    });
  });
});

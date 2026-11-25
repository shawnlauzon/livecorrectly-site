'use client';

import { useEffect } from 'react';
import { track } from '@/lib/analytics';
import { firstTimeThisSession } from '@/lib/once-per-session';

/**
 * On /work-with-me/thanks, when Stripe's redirect carried a checkout session id:
 * records the GA4 purchase once per session id in this browser.
 */
export default function OfferPurchase({
  sessionId,
  offer,
}: {
  sessionId: string;
  offer: { id: string; name: string; price: number };
}) {
  const { id, name, price } = offer;
  useEffect(() => {
    if (!firstTimeThisSession(`offer_purchase_${sessionId}`)) return;
    track('purchase', {
      transaction_id: sessionId,
      currency: 'USD',
      value: price,
      items: [{ item_id: id, item_name: name, price }],
    });
  }, [sessionId, id, name, price]);

  return null;
}

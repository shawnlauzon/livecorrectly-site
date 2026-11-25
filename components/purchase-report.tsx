'use client';

import { useEffect } from 'react';
import { track } from '@/lib/analytics';
import { firstTimeThisSession } from '@/lib/once-per-session';

/**
 * On a thank-you page, when Stripe's redirect carried a checkout session id:
 * records the GA4 purchase, and for someone whose birth details are already on
 * file (`subscriberId`) reports the purchase so Shawn is notified and the buyer
 * gets a confirmation. `offerId` names a pay-first offer; omit it for the guide.
 * Runs once per session id in this browser; the server also ignores repeats.
 */
export default function PurchaseReport({
  sessionId,
  item,
  subscriberId,
  offerId,
}: {
  sessionId: string;
  item: { id: string; name: string; price: number };
  subscriberId?: string;
  offerId?: string;
}) {
  const { id, name, price } = item;
  useEffect(() => {
    if (!firstTimeThisSession(`purchase_${sessionId}`)) return;

    track('purchase', {
      transaction_id: sessionId,
      currency: 'USD',
      value: price,
      items: [{ item_id: id, item_name: name, price }],
    });

    if (subscriberId) {
      fetch('/api/guide/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          subscriber_id: subscriberId,
          ...(offerId && { offer_id: offerId }),
        }),
      }).catch((err) => console.error('Failed to report purchase:', err));
    }
  }, [sessionId, id, name, price, subscriberId, offerId]);

  return null;
}

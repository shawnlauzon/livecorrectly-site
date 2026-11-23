'use client';

import { useEffect } from 'react';
import { track } from '@/lib/analytics';
import { STARTER } from '@/lib/offers';

/**
 * On /guide/thanks, when Stripe's redirect carried a checkout session id:
 * records the GA4 purchase, and for someone whose birth details are already on
 * file (`subscriberId`) reports the purchase so Shawn is notified and the buyer
 * gets a confirmation. Runs once per session id in this browser; the server
 * also ignores repeats.
 */
export default function GuidePurchase({
  sessionId,
  subscriberId,
}: {
  sessionId: string;
  subscriberId?: string;
}) {
  useEffect(() => {
    const key = `guide_purchase_${sessionId}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, '1');
    } catch {
      // Storage unavailable: carry on, GA4 dedupes on transaction_id and the server on the subscriber.
    }

    track('purchase', {
      transaction_id: sessionId,
      currency: 'USD',
      value: STARTER.price,
      items: [{ item_id: STARTER.id, item_name: STARTER.name, price: STARTER.price }],
    });

    if (subscriberId) {
      fetch('/api/guide/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, subscriber_id: subscriberId }),
      }).catch((err) => console.error('Failed to report guide purchase:', err));
    }
  }, [sessionId, subscriberId]);

  return null;
}

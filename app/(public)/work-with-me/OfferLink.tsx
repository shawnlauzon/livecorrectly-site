"use client";

import { track } from "@/lib/analytics";

/**
 * External booking link (Google Calendar) that records which offer was clicked.
 * `free` marks the 15-minute call, tracked as the existing consultation event.
 */
export default function OfferLink({
  href,
  offerId,
  free = false,
  checkoutValue,
  className,
  children,
}: {
  href?: string;
  offerId: string;
  free?: boolean;
  /** Set for offers bought outright (Stripe): fires GA4 begin_checkout with this value. */
  checkoutValue?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      className={className}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        if (checkoutValue != null) {
          track("begin_checkout", {
            currency: "USD",
            value: checkoutValue,
            items: [{ item_id: offerId, price: checkoutValue }],
            location: "work_with_me",
          });
        } else {
          track(free ? "book_consultation_click" : "book_offer_click", {
            location: "work_with_me",
            offer: offerId,
          });
        }
      }}
    >
      {children}
    </a>
  );
}

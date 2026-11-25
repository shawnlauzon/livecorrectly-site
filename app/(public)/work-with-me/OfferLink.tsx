"use client";

import { track } from "@/lib/analytics";

/**
 * External link (Google Calendar booking, or a pay-first offer's Stripe checkout) that
 * records which offer was clicked.
 * `free` marks the 15-minute call, tracked as the existing consultation event.
 * `checkout` marks a pay-first offer's Stripe link, tracked as GA4 begin_checkout.
 */
export default function OfferLink({
  href,
  offerId,
  free = false,
  checkout,
  className,
  children,
}: {
  href?: string;
  offerId: string;
  free?: boolean;
  checkout?: { name: string; price: number };
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
        if (checkout) {
          track("begin_checkout", {
            currency: "USD",
            value: checkout.price,
            items: [{ item_id: offerId, item_name: checkout.name, price: checkout.price }],
            location: "work_with_me",
          });
          return;
        }
        track(free ? "book_consultation_click" : "book_offer_click", {
          location: "work_with_me",
          offer: offerId,
        });
      }}
    >
      {children}
    </a>
  );
}

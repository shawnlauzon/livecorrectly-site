/**
 * Single source of truth for offers: names, prices,
 * descriptions and booking links.
 *
 * Booking links come from env vars (one Google Calendar appointment schedule
 * per offer, each with its own Stripe price). An offer whose link isn't set
 * falls back to the free 15-minute call, so the page never shows a dead button.
 */

/** Free 15-minute call. Reuses the existing site-wide booking link. */
export const FREE_CALL_URL = process.env.NEXT_PUBLIC_BOOKING_URL;


export type Offer = {
  /** Anchor id on /work-with-me, e.g. /work-with-me#guided */
  id: string;
  name: string;
  price: number;
  /** What it helps with, first. Plain language, no Human Design terms. */
  description: string;
  /** Small print: format, timing, who it's for. */
  details?: string;
  /** Personalized guides included: one per person (Partnership covers both). */
  guides: number;
  includesFollowUp: boolean;
  bookingUrl?: string;
  /** Show the free-call link beside this offer (bigger decisions). */
  offerFreeCall?: boolean;
};

export type OfferGroup = {
  id: string;
  heading: string;
  offers: Offer[];
  /** Cycle offers depend on the person's dates; the page adds a line about that. */
  dateDependent?: boolean;
};

export const OFFER_GROUPS: OfferGroup[] = [
  {
    id: "who-you-are",
    heading: "Who you are",
    offers: [
      {
        id: "guided",
        name: "Guided",
        price: 97,
        description:
          "Bring what you’re wrestling with. I’ll tell you what your design says about it.",
        details: "One 90-minute conversation.",
        guides: 1,
        includesFollowUp: false,
        bookingUrl: process.env.NEXT_PUBLIC_BOOKING_URL_GUIDED,
      },
      {
        id: "deep-dive",
        name: "Deep Dive",
        price: 497,
        description:
          "For when one conversation isn’t enough. We go much further into how you decide, how you work, and where you keep getting pulled off course.",
        details: "Three 90-minute conversations.",
        guides: 1,
        includesFollowUp: true,
        bookingUrl: process.env.NEXT_PUBLIC_BOOKING_URL_DEEP_DIVE,
        offerFreeCall: true,
      },
    ],
  },
  {
    id: "where-you-are",
    heading: "Where you are",
    offers: [
      {
        id: "year-ahead",
        name: "Your year ahead",
        price: 197,
        description:
          "Each birthday starts a new yearly cycle. What the coming one holds for you, applied to what you’re dealing with now.",
        details: "Best in the three months before your birthday. One 90-minute conversation.",
        guides: 1,
        includesFollowUp: true,
        bookingUrl: process.env.NEXT_PUBLIC_BOOKING_URL_YEAR_AHEAD,
      },
      {
        id: "next-ten-years",
        name: "Your next ten years",
        price: 297,
        description:
          "Every decade or so a bigger cycle turns over, and what used to work stops working. What’s changing for you, and what to do with it.",
        details: "Best within a few years either side of your cycle date. One conversation of up to two hours.",
        guides: 1,
        includesFollowUp: true,
        bookingUrl: process.env.NEXT_PUBLIC_BOOKING_URL_NEXT_TEN_YEARS,
        offerFreeCall: true,
      },
    ],
    dateDependent: true,
  },
  {
    id: "who-youre-with",
    heading: "Who you’re with",
    offers: [
      {
        id: "partnership",
        name: "Partnership",
        price: 497,
        description:
          "Understand the person you keep clashing with — a partner, a parent, a co-founder — and what to do differently.",
        guides: 2,
        includesFollowUp: true,
        bookingUrl: process.env.NEXT_PUBLIC_BOOKING_URL_PARTNERSHIP,
        offerFreeCall: true,
      },
    ],
  },
];

export function findOffer(id: string): Offer | undefined {
  for (const group of OFFER_GROUPS) {
    const offer = group.offers.find((o) => o.id === id);
    if (offer) return offer;
  }
  return undefined;
}

/**
 * The personalized guide on its own. Not "working with me", so it isn't on
 * /work-with-me: it's sold from the homepage, bought outright through a Stripe
 * Payment Link and delivered by email within 24 hours.
 */
export const STARTER = {
  id: "starter",
  name: "Personalized guide to living correctly",
  price: 47,
  buyUrl: process.env.NEXT_PUBLIC_BUY_URL_STARTER,
} as const;

/** Value of one personalized guide, quoted on every offer that includes one. */
export const GUIDE_VALUE = STARTER.price;

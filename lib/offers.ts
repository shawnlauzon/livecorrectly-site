/**
 * Single source of truth for offers: names, prices,
 * descriptions, booking links, and the Black Friday sale.
 *
 * Booking links come from env vars (one Google Calendar appointment schedule
 * per offer, each with its own Stripe price). An offer whose link isn't set
 * falls back to the free 15-minute call, so the page never shows a dead button.
 */

/**
 * Free 15-minute call. Reuses the existing site-wide booking link (set in the
 * checked-in .env). Several pages link to it with no fallback, so a missing
 * value stops the build rather than shipping links that go nowhere.
 */
export const FREE_CALL_URL = requireUrl(
  'NEXT_PUBLIC_BOOKING_URL',
  process.env.NEXT_PUBLIC_BOOKING_URL,
);

function requireUrl(name: string, value: string | undefined): string {
  if (!value) throw new Error(`${name} is not set: the free 15-minute call links would go nowhere.`);
  return value;
}


export type Offer = {
  /** Anchor id on /work-with-me, e.g. /work-with-me#guided */
  id: string;
  name: string;
  /** Button label, e.g. "Book one conversation". */
  cta: string;
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
  /** The situation this group is for, in the visitor's words. */
  problem: string;
  /** A client's own words, shown under the heading. */
  quote?: { text: string; name: string };
  offers: Offer[];
  /** Cycle offers depend on the person's dates; the page adds a line about that. */
  dateDependent?: boolean;
};

export const OFFER_GROUPS: OfferGroup[] = [
  {
    id: "who-you-are",
    heading: "Who you are",
    problem: "When the way you work doesn’t fit you.",
    quote: {
      text: "…he explained the aspects of what my results uncovered and answered all of my questions so I could get a practical understanding.",
      name: "Jessica",
    },
    offers: [
      {
        id: "guided",
        name: "Guided",
        cta: "Book one conversation",
        price: 97,
        description:
          "One thing that’s stuck: a decision, a way of working, something that keeps wearing you out. You leave knowing what your design says to do about it.",
        details: "One 90-minute conversation.",
        guides: 1,
        includesFollowUp: false,
        bookingUrl: process.env.NEXT_PUBLIC_BOOKING_URL_GUIDED,
      },
      {
        id: "deep-dive",
        name: "Deep Dive",
        cta: "Book the Deep Dive",
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
    problem: "When what used to work has stopped working.",
    offers: [
      {
        id: "year-ahead",
        name: "Your year ahead",
        cta: "Book your year ahead",
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
        cta: "Book your next ten years",
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
    problem: "When you can’t get through to someone.",
    quote: {
      text: "I didn’t know how to speak with him. I was like, are you from another planet?",
      name: "Andrea",
    },
    offers: [
      {
        id: "partnership",
        name: "Partnership",
        cta: "Book a Partnership conversation",
        price: 497,
        description:
          "Understand the person you keep clashing with — a partner, a parent, a co-founder — and what to do differently.",
        details: "One two-hour conversation with both of you. I’ll need birth details for each of you.",
        guides: 2,
        includesFollowUp: true,
        bookingUrl: process.env.NEXT_PUBLIC_BOOKING_URL_PARTNERSHIP,
        offerFreeCall: true,
      },
    ],
  },
];

/**
 * Black Friday: Guided at a lower price for everyone. Lives on its own
 * branch: it's on the site exactly while this code is deployed. Shawn changes
 * the price on the Guided booking link to match; this only drives what the
 * site shows.
 */
export const BLACK_FRIDAY = {
  offerId: "guided",
  price: 47,
  /** Last day of the sale, as shown on the site: "through Cyber Monday" */
  endsOn: "Cyber Monday",
} as const;

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
 *
 * The Payment Link collects no birth details. In Stripe it's set to redirect
 * after payment to /guide/thanks?session_id={CHECKOUT_SESSION_ID}, where a known
 * subscriber is done and anyone else fills in the normal chart form.
 */
export const STARTER = {
  id: "starter",
  name: "Personalized guide to living correctly",
  price: 47,
  buyUrl: process.env.NEXT_PUBLIC_BUY_URL_STARTER,
} as const;

/** Value of one personalized guide, quoted on every offer that includes one. */
export const GUIDE_VALUE = STARTER.price;

/**
 * Buy link for the guide. For a known subscriber it carries their id as
 * Stripe's client_reference_id, so the payment shows who bought it.
 */
export function guideBuyUrl(subscriberId?: string | null): string | undefined {
  if (!STARTER.buyUrl) return undefined;
  if (!subscriberId) return STARTER.buyUrl;
  const url = new URL(STARTER.buyUrl);
  url.searchParams.set("client_reference_id", subscriberId);
  return url.toString();
}

/**
 * Buy link for someone whose birth details are on file (emails, the design
 * page). Goes through /guide/buy so the thank-you page recognises them after
 * Stripe and doesn't ask for birth details again. Undefined until the Stripe
 * link is set.
 */
export function guideBuyPath(subscriberId: string): string | undefined {
  if (!STARTER.buyUrl) return undefined;
  return `/guide/buy?s=${subscriberId}`;
}

/** Stripe Checkout Session id, as Stripe puts it in the redirect URL. */
export function isCheckoutSessionId(value: unknown): value is string {
  return typeof value === "string" && /^cs_(test|live)_[A-Za-z0-9]{1,200}$/.test(value);
}

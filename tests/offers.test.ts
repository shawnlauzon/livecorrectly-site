import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { OFFER_GROUPS } from "@/lib/offers";

describe("offers", () => {
  it("offer ids are unique (they double as page anchors)", () => {
    const ids = OFFER_GROUPS.flatMap((g) => g.offers.map((o) => o.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("guide purchase helpers", () => {
  it("accepts Stripe checkout session ids and rejects anything else", async () => {
    const { isCheckoutSessionId } = await import("@/lib/offers");
    expect(isCheckoutSessionId("cs_live_a1B2c3")).toBe(true);
    expect(isCheckoutSessionId("cs_test_a1B2c3")).toBe(true);
    expect(isCheckoutSessionId("{CHECKOUT_SESSION_ID}")).toBe(false);
    expect(isCheckoutSessionId("cs_live_<script>")).toBe(false);
    expect(isCheckoutSessionId(undefined)).toBe(false);
  });
});

describe("guideBuyUrl", () => {
  beforeAll(() => {
    vi.stubEnv("NEXT_PUBLIC_BUY_URL_STARTER", "https://buy.stripe.com/test_abc");
    vi.resetModules();
  });

  it("adds the subscriber id as client_reference_id", async () => {
    const { guideBuyUrl } = await import("@/lib/offers");
    expect(guideBuyUrl("11111111-1111-4111-8111-111111111111")).toBe(
      "https://buy.stripe.com/test_abc?client_reference_id=11111111-1111-4111-8111-111111111111"
    );
  });

  it("leaves the link alone for a new visitor", async () => {
    const { guideBuyUrl } = await import("@/lib/offers");
    expect(guideBuyUrl(null)).toBe("https://buy.stripe.com/test_abc");
  });
});

describe("pay-first offers", () => {
  const SUBSCRIBER = "11111111-1111-4111-8111-111111111111";

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  async function load(buy: string, schedule: string) {
    vi.stubEnv("NEXT_PUBLIC_BUY_URL_GUIDED", buy);
    vi.stubEnv("NEXT_PUBLIC_SCHEDULE_URL_GUIDED", schedule);
    vi.resetModules();
    return import("@/lib/offers");
  }

  it("is pay-first when both the buy link and the schedule are set", async () => {
    const { findOffer, isPayFirst, offerBuyUrl } = await load(
      "https://buy.stripe.com/test_guided",
      "https://calendar.google.com/schedule"
    );
    const guided = findOffer("guided")!;
    expect(isPayFirst(guided)).toBe(true);
    // During Black Friday the Guided link also carries the promotion code
    // (tested separately); compare everything else.
    const withoutPromo = (u?: string) => {
      const url = new URL(u!);
      url.searchParams.delete("prefilled_promo_code");
      return url.toString();
    };
    expect(withoutPromo(offerBuyUrl(guided, null))).toBe("https://buy.stripe.com/test_guided");
    expect(withoutPromo(offerBuyUrl(guided, SUBSCRIBER))).toBe(
      `https://buy.stripe.com/test_guided?client_reference_id=${SUBSCRIBER}`
    );
  });

  it("is not pay-first with only the buy link", async () => {
    const { findOffer, isPayFirst, offerBuyUrl } = await load("https://buy.stripe.com/test_guided", "");
    const guided = findOffer("guided")!;
    expect(isPayFirst(guided)).toBe(false);
    expect(offerBuyUrl(guided, SUBSCRIBER)).toBeUndefined();
  });

  it("is not pay-first with only the schedule", async () => {
    const { findOffer, isPayFirst } = await load("", "https://calendar.google.com/schedule");
    expect(isPayFirst(findOffer("guided")!)).toBe(false);
  });

  it("leaves every other offer as it was", async () => {
    const { findOffer, isPayFirst } = await load(
      "https://buy.stripe.com/test_guided",
      "https://calendar.google.com/schedule"
    );
    for (const id of ["deep-dive", "year-ahead", "next-ten-years", "partnership"]) {
      expect(isPayFirst(findOffer(id)!)).toBe(false);
    }
  });
});

describe("free 15-minute call link", () => {
  it("stops the build instead of rendering a dead link when it isn't set", async () => {
    vi.stubEnv("NEXT_PUBLIC_BOOKING_URL", "");
    vi.resetModules();
    try {
      await expect(import("@/lib/offers")).rejects.toThrow(/NEXT_PUBLIC_BOOKING_URL/);
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });
});

describe("offerThanksPath", () => {
  it("builds the thank-you path with optional session and subscriber", async () => {
    const { offerThanksPath } = await import("@/lib/offers");
    const s = "11111111-1111-4111-8111-111111111111";
    expect(offerThanksPath("guided", "cs_test_abc", s)).toBe(
      `/work-with-me/thanks?offer=guided&session_id=cs_test_abc&s=${s}`,
    );
    expect(offerThanksPath("guided", null)).toBe("/work-with-me/thanks?offer=guided");
    expect(offerThanksPath("guided", "cs_test_abc")).toBe(
      "/work-with-me/thanks?offer=guided&session_id=cs_test_abc",
    );
  });
});

describe("Black Friday", () => {
  it("the sale offer exists and is cheaper than its normal price", async () => {
    const { BLACK_FRIDAY, findOffer } = await import("@/lib/offers");
    const offer = findOffer(BLACK_FRIDAY.offerId);
    expect(offer).toBeDefined();
    expect(BLACK_FRIDAY.price).toBeLessThan(offer!.price);
  });
});

describe("currentPrice", () => {
  it("reports the sale price for the sale offer and the normal price for the rest", async () => {
    const { BLACK_FRIDAY, currentPrice, findOffer } = await import("@/lib/offers");
    expect(currentPrice(findOffer(BLACK_FRIDAY.offerId)!)).toBe(BLACK_FRIDAY.price);
    const other = findOffer("deep-dive")!;
    expect(currentPrice(other)).toBe(other.price);
  });
});

describe("Black Friday promotion code", () => {
  it("prefills the code on the sale offer's Stripe link, and only there", async () => {
    vi.stubEnv("NEXT_PUBLIC_BUY_URL_GUIDED", "https://buy.stripe.com/test_guided");
    vi.stubEnv("NEXT_PUBLIC_SCHEDULE_URL_GUIDED", "https://calendar.app.google/test");
    vi.resetModules();
    try {
      const { BLACK_FRIDAY, findOffer, offerBuyUrl } = await import("@/lib/offers");
      const id = "11111111-1111-4111-8111-111111111111";
      const url = new URL(offerBuyUrl(findOffer(BLACK_FRIDAY.offerId)!, id)!);
      expect(url.searchParams.get("prefilled_promo_code")).toBe(BLACK_FRIDAY.promoCode);
      expect(url.searchParams.get("client_reference_id")).toBe(id);
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });
});


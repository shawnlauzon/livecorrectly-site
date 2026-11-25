import { beforeAll, describe, expect, it, vi } from "vitest";
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

describe("Black Friday", () => {
  it("the sale offer exists and is cheaper than its normal price", async () => {
    const { BLACK_FRIDAY, findOffer } = await import("@/lib/offers");
    const offer = findOffer(BLACK_FRIDAY.offerId);
    expect(offer).toBeDefined();
    expect(BLACK_FRIDAY.price).toBeLessThan(offer!.price);
  });
});

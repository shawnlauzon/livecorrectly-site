import { describe, expect, it } from "vitest";
import { BLACK_FRIDAY, OFFER_GROUPS, findOffer, isBlackFriday } from "@/lib/offers";

describe("isBlackFriday", () => {
  it("is off the day before (Tue Nov 24, late evening Austin time)", () => {
    expect(isBlackFriday(new Date("2026-11-24T23:59:00-06:00"))).toBe(false);
  });

  it("starts at midnight Wed Nov 25, Austin time", () => {
    expect(isBlackFriday(new Date("2026-11-25T00:00:00-06:00"))).toBe(true);
  });

  it("runs through Sunday night", () => {
    expect(isBlackFriday(new Date("2026-11-29T23:59:00-06:00"))).toBe(true);
  });

  it("ends at midnight going into Monday", () => {
    expect(isBlackFriday(new Date("2026-11-30T00:00:00-06:00"))).toBe(false);
  });
});

describe("offers", () => {
  it("the Black Friday offer exists and is cheaper than its normal price", () => {
    const offer = findOffer(BLACK_FRIDAY.offerId);
    expect(offer).toBeDefined();
    expect(BLACK_FRIDAY.price).toBeLessThan(offer!.price);
  });

  it("offer ids are unique (they double as page anchors)", () => {
    const ids = OFFER_GROUPS.flatMap((g) => g.offers.map((o) => o.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

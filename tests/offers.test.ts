import { describe, expect, it } from "vitest";
import { OFFER_GROUPS } from "@/lib/offers";

describe("offers", () => {
  it("offer ids are unique (they double as page anchors)", () => {
    const ids = OFFER_GROUPS.flatMap((g) => g.offers.map((o) => o.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

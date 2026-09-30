// apps/mobile/test/screens/artist/singleMeta.test.ts
//
// Tests for the singles subtitle helper.
//
// Tested:
// - singleMeta
//
// What is covered:
// - kind and year, kind only, year only, neither
//
// Run with: pnpm --filter @beatly/mobile test -- singleMeta
//
// SEE: apps/mobile/src/screens/artist/singleMeta.ts

import type { ArtistSingle } from "@beatly/core";
import { describe, expect, it } from "@jest/globals";

import { useT } from "../../../src/adapters/i18n.ts";
import { singleMeta } from "../../../src/screens/artist/singleMeta.ts";

const t = useT("artist");
const single = (over: Partial<ArtistSingle>): ArtistSingle => ({
  id: "MPREb_4",
  title: "A Single",
  year: "2024",
  type: "Single",
  thumbnail_url: null,
  ...over,
});

describe("singleMeta", () => {
  it("joins the kind and the year", () => {
    expect(singleMeta(single({}), t)).toBe("Single · 2024");
    expect(singleMeta(single({ type: "EP", year: "2023" }), t)).toBe("EP · 2023");
  });

  it("draws the kind alone when there is no year", () => {
    expect(singleMeta(single({ year: null }), t)).toBe("Single");
  });

  it("draws the year alone when there is no kind", () => {
    expect(singleMeta(single({ type: null }), t)).toBe("2024");
  });

  it("returns undefined when there is neither", () => {
    expect(singleMeta(single({ type: null, year: null }), t)).toBeUndefined();
  });
});

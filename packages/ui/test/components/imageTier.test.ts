// packages/ui/test/components/imageTier.test.ts
//
// Tests for the image tier rule.
//
// Tested:
// - imageTier
// - imageUri
//
// What is covered:
// - the boundaries of the rule: 64 pt is small, 65 medium, 200 medium, 201 large
// - the tier of each place of DESIGN.md, Image tiers (rows, cards, grid on a phone, mosaic cells, heroes, player cover, image hero)
// - imageUri returns the picked field unchanged
//
// Run with: pnpm --filter @beatly/ui test -- imageTier
//
// SEE: packages/ui/src/components/imageTier.ts

import { describe, expect, it } from "@jest/globals";

import { gridCardSize } from "../../src/components/MediaGrid.tsx";
import { imageTier, imageUri, type ImageTier } from "../../src/components/imageTier.ts";
import { layout, spacing } from "../../src/tokens/spacing.ts";

describe("imageTier", () => {
  const boundaries: readonly (readonly [number, ImageTier])[] = [
    [64, "small"],
    [65, "medium"],
    [200, "medium"],
    [201, "large"],
  ];

  it.each(boundaries)("%i points draw the %s tier", (points, tier) => {
    expect(imageTier(points)).toBe(tier);
  });

  const places: readonly (readonly [string, number, ImageTier])[] = [
    ["row cover", layout.rowCover, "small"],
    ["medium row cover", layout.rowCoverMedium, "small"],
    ["large row cover", layout.rowCoverLarge, "small"],
    ["row mosaic cell", layout.rowCoverMedium / 2, "small"],
    ["carousel card", layout.carouselCard, "medium"],
    ["carousel mosaic cell", layout.carouselCard / 2, "medium"],
    ["hero mosaic cell", layout.heroCover / 2, "medium"],
    ["grid card at 320", gridCardSize(320), "medium"],
    ["grid card at 390", gridCardSize(390), "medium"],
    ["grid card at 440", gridCardSize(440), "medium"],
    ["hero cover", layout.heroCover, "large"],
    ["player cover at 390", 390 - 2 * spacing.xl, "large"],
    ["image hero at 390", 390, "large"],
  ];

  it.each(places)("the %s draws the %s tier", (_place, points, tier) => {
    expect(imageTier(points)).toBe(tier);
  });
});

describe("imageUri", () => {
  it("returns the picked tier's URL unchanged", () => {
    const image = { small: "test://img/s", medium: "test://img/m", large: "test://img/l" };
    expect(imageUri(image, layout.rowCover)).toBe("test://img/s");
    expect(imageUri(image, layout.carouselCard)).toBe("test://img/m");
    expect(imageUri(image, layout.heroCover)).toBe("test://img/l");
  });
});

// packages/ui/test/detail-wash-contrast.test.ts
//
// Cross-cutting test: the detail's info text sits on dark enough wash with the lightest cover color the backend sends.
//
// Tested:
// - color.gradient.detailHero, layout.heroWashExtension and the text colors, as arithmetic on the tokens
//
// What is covered:
// - secondary and tertiary text at the title's top have at least 4.5:1 over the lightest cover color, at the worst inset
// - the player and its sheet keep the detailHero intensity and its seven stops
//
// Run with: pnpm --filter @beatly/ui test -- detail-wash-contrast
//
// SEE: packages/ui/src/components/DetailScreen.tsx, DESIGN.md (Detail screen base)

import { describe, expect, it } from "@jest/globals";

import { color } from "../src/tokens/color.ts";
import { layout, spacing } from "../src/tokens/spacing.ts";

// The backend darkens a cover color until white on it is 4.5:1 ("White becomes #767676", conventions.md,
// Adjustment to the dark theme): the lightest color the wash can have.
const LIGHTEST = "#767676";
const MIN_RATIO = 4.5;

function channels(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance([r, g, b]: readonly [number, number, number]): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: readonly [number, number, number], b: readonly [number, number, number]) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

// The wash opacity at an offset: linear between the stops.
function opacityAt(offset: number): number {
  const stops = color.gradient.detailHero.stops;
  for (let i = 1; i < stops.length; i++) {
    const from = stops[i - 1];
    const to = stops[i];
    if (from === undefined || to === undefined || offset > to.offset) continue;
    return (
      from.opacity +
      ((to.opacity - from.opacity) * (offset - from.offset)) / (to.offset - from.offset)
    );
  }
  return 0;
}

// The wash composited over the base surface, in sRGB channels, as the svg gradient does.
function washAt(offset: number): [number, number, number] {
  const base = channels(color.surface.base);
  const wash = channels(LIGHTEST);
  const opacity = opacityAt(offset);
  return [0, 1, 2].map((i) => (base[i] ?? 0) + ((wash[i] ?? 0) - (base[i] ?? 0)) * opacity) as [
    number,
    number,
    number,
  ];
}

// Geometry at topInset 0, the worst case (DetailScreen.tsx styles.hero and styles.title): the hero is the
// back's row, spacing.sm, the cover and spacing.xl; the wash reaches heroWashExtension below it; the title
// starts spacing.lg under the hero.
const hero = layout.controlHeight + spacing.sm + layout.heroCover + spacing.xl;
const titleTop = hero + spacing.lg;
const offsetAtTitleTop = titleTop / (hero + layout.heroWashExtension);

describe("detail wash contrast", () => {
  it("secondary text at the title's top has at least 4.5:1", () => {
    const ratio = contrast(channels(color.text.secondary), washAt(offsetAtTitleTop));
    expect(ratio).toBeGreaterThanOrEqual(MIN_RATIO);
  });

  it("tertiary text at the title's top has at least 4.5:1", () => {
    const ratio = contrast(channels(color.text.tertiary), washAt(offsetAtTitleTop));
    expect(ratio).toBeGreaterThanOrEqual(MIN_RATIO);
  });

  it("the player keeps the detailHero stops", () => {
    expect(color.gradient.detailHero.intensity).toBe(0.7);
    expect(color.gradient.detailHero.stops.map((stop) => stop.offset)).toEqual([
      0, 0.2, 0.4, 0.6, 0.75, 0.88, 1,
    ]);
    expect(color.gradient.detailHero.stops[0]?.opacity).toBeCloseTo(0.7);
    expect(color.gradient.detailHero.stops[6]?.opacity).toBe(0);
  });
});

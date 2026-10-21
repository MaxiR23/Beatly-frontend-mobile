// packages/ui/test/components/detailCollapse.test.ts
//
// Tests for the detail header's collapse ranges and phase.
//
// Tested:
// - collapseRanges
// - collapsePhase
//
// What is covered:
// - null ranges until the hero (and, on the cover hero, the title) is measured
// - the ranges on both heroes, the top inset shift, the order buttons, title, bar
// - clamping at zero on a hero shorter than the bar
// - one phase at every offset, so the two button sets never both take touches
//
// Run with: pnpm --filter @beatly/ui test -- detailCollapse
//
// SEE: packages/ui/src/components/detailCollapse.ts

import { describe, expect, it } from "@jest/globals";

import { collapsePhase, collapseRanges } from "../../src/components/detailCollapse.ts";
import { motion } from "../../src/tokens/motion.ts";
import { layout } from "../../src/tokens/spacing.ts";

const fade = motion.detailCollapse.fade;
function must<T>(value: T | null): T {
  if (value === null) throw new Error("expected ranges");
  return value;
}

const lead = motion.detailCollapse.barLead * fade;

describe("collapseRanges", () => {
  it("returns null until the hero is measured", () => {
    for (const hero of ["cover", "image"] as const) {
      expect(collapseRanges({ hero, heroHeight: null, titleHeight: 50, topInset: 0 })).toBeNull();
    }
  });

  it("returns null on the cover hero until the title is measured", () => {
    expect(
      collapseRanges({ hero: "cover", heroHeight: 400, titleHeight: null, topInset: 0 }),
    ).toBeNull();
  });

  it("needs only the hero height on the image hero", () => {
    expect(
      collapseRanges({ hero: "image", heroHeight: 390, titleHeight: null, topInset: 0 }),
    ).not.toBeNull();
  });

  it("puts the cover title's bottom under the hero", () => {
    const r = must(
      collapseRanges({ hero: "cover", heroHeight: 400, titleHeight: 50, topInset: 0 }),
    );
    const gone = 450 - layout.controlHeight;
    expect(r.title).toEqual([gone - fade, gone]);
    expect(r.buttons).toEqual([gone - 2 * fade, gone - fade]);
    expect(r.cover).toEqual([0, gone - fade]);
    expect(r.bar[0]).toBe(gone - lead);
    expect(r.bar[1]).toBe(gone - lead + fade);
  });

  it("puts the image title's bottom at the hero's bottom", () => {
    const r = must(
      collapseRanges({ hero: "image", heroHeight: 390, titleHeight: null, topInset: 0 }),
    );
    const gone = 390 - layout.controlHeight;
    expect(r.title).toEqual([gone - fade, gone]);
  });

  it("moves every range with the top inset", () => {
    const base = must(
      collapseRanges({ hero: "cover", heroHeight: 400, titleHeight: 50, topInset: 0 }),
    );
    const moved = must(
      collapseRanges({ hero: "cover", heroHeight: 400, titleHeight: 50, topInset: 47 }),
    );
    expect(moved.title).toEqual([base.title[0] - 47, base.title[1] - 47]);
    expect(moved.bar).toEqual([base.bar[0] - 47, base.bar[1] - 47]);
    expect(moved.buttons).toEqual([base.buttons[0] - 47, base.buttons[1] - 47]);
  });

  it("orders buttons, title, bar on both heroes", () => {
    for (const hero of ["cover", "image"] as const) {
      const r = must(collapseRanges({ hero, heroHeight: 400, titleHeight: 60, topInset: 20 }));
      expect(r.buttons[1]).toBeLessThanOrEqual(r.title[0]);
      expect(r.buttons[0]).toBeLessThanOrEqual(r.buttons[1]);
      expect(r.bar[0]).toBeGreaterThanOrEqual(r.buttons[1]);
      expect(r.title[1]).toBeGreaterThan(r.title[0]);
    }
  });

  it("clamps every bound at zero and keeps each range non-decreasing", () => {
    for (const hero of ["cover", "image"] as const) {
      const r = must(collapseRanges({ hero, heroHeight: 10, titleHeight: 10, topInset: 0 }));
      for (const range of [r.cover, r.buttons, r.title, r.bar]) {
        expect(range[0]).toBeGreaterThanOrEqual(0);
        expect(range[1]).toBeGreaterThanOrEqual(range[0]);
      }
    }
  });
});

describe("collapsePhase", () => {
  it("never lets both sets take touches", () => {
    for (const hero of ["cover", "image"] as const) {
      for (const heroHeight of [10, 120, 300, 400, 600]) {
        const r = must(collapseRanges({ hero, heroHeight, titleHeight: 50, topInset: 20 }));
        expect(r.bar[0]).toBeGreaterThanOrEqual(r.buttons[1]);
        for (let offset = -50; offset <= r.bar[1] + 50; offset++) {
          const phase = collapsePhase(offset, r);
          expect(["expanded", "between", "collapsed"]).toContain(phase);
          if (phase === "expanded") expect(offset).toBeLessThan(r.buttons[1]);
          if (phase === "collapsed") expect(offset).toBeGreaterThanOrEqual(r.bar[0]);
          if (phase === "between") {
            expect(offset).toBeGreaterThanOrEqual(r.buttons[1]);
            expect(offset).toBeLessThan(r.bar[0]);
          }
        }
      }
    }
  });

  it("is expanded without ranges", () => {
    expect(collapsePhase(500, null)).toBe("expanded");
  });
});

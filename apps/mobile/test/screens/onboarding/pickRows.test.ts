// apps/mobile/test/screens/onboarding/pickRows.test.ts
//
// Tests for the layout of the onboarding's grid.
//
// Tested:
// - pickRows
//
// What is covered:
// - rows of three in the order given
// - a related row after the row of an expanded artist, as returned, once per artist, nested depth-first
// - no row without loaded related, a related row kept for an artist expanded and then unpicked
//
// Run with: pnpm --filter @beatly/mobile test -- pickRows
//
// SEE: apps/mobile/src/screens/onboarding/pickRows.ts

import { describe, expect, it } from "@jest/globals";

import type { PickedArtist } from "../../../src/screens/onboarding/onboardingRules.ts";
import { pickRows } from "../../../src/screens/onboarding/pickRows.ts";

const artist = (id: string): PickedArtist => ({ id, name: id, image: null });
const base = ["a", "b", "c", "d", "e"].map(artist);
const ids = (rows: ReturnType<typeof pickRows>) =>
  rows.map((row) => row.artists.map((item) => item.id).join(""));

describe("pickRows", () => {
  it("chunks the artists into rows of three in order, with no related row when nothing is expanded", () => {
    const rows = pickRows(base, new Set(), () => undefined);
    expect(ids(rows)).toEqual(["abc", "de"]);
    expect(rows.every((row) => !row.related)).toBe(true);
  });

  it("is empty for no artists", () => {
    expect(pickRows([], new Set(["a"]), () => [artist("x")])).toEqual([]);
  });

  it("inserts a related row after the row of an expanded artist", () => {
    const rows = pickRows(base, new Set(["b"]), (id) => (id === "b" ? [artist("x")] : undefined));
    expect(ids(rows)).toEqual(["abc", "x", "de"]);
    expect(rows[1]).toMatchObject({ key: "related:b", related: true });
  });

  it("a similar row holds the artists returned, in their order", () => {
    const related = ["p", "q", "r"].map(artist);
    const rows = pickRows(base, new Set(["a"]), (id) => (id === "a" ? related : undefined));
    expect(ids(rows)).toEqual(["abc", "pqr", "de"]);
  });

  it("once per artist even when two artists relate to each other", () => {
    const rows = pickRows([artist("a"), artist("b")], new Set(["a", "b"]), (id) =>
      id === "a" ? [artist("b")] : [artist("a")],
    );
    expect(ids(rows)).toEqual(["ab", "b", "a"]);
  });

  it("nested related rows depth-first", () => {
    const relatedOf = (id: string) =>
      id === "a"
        ? [artist("x")]
        : id === "x"
          ? [artist("y")]
          : id === "c"
            ? [artist("z")]
            : undefined;
    const rows = pickRows(base, new Set(["a", "x", "c"]), relatedOf);
    expect(ids(rows)).toEqual(["abc", "x", "y", "z", "de"]);
  });

  it("no row for an id with no loaded related", () => {
    const rows = pickRows(base, new Set(["a", "d"]), (id) => (id === "d" ? [] : undefined));
    expect(ids(rows)).toEqual(["abc", "de"]);
  });

  it("keeps the row of an artist expanded and then unpicked", () => {
    // The set is every artist ever picked in the run, so unpicking changes nothing here.
    const rows = pickRows(base, new Set(["a"]), (id) => (id === "a" ? [artist("x")] : undefined));
    expect(ids(rows)).toEqual(["abc", "x", "de"]);
  });
});

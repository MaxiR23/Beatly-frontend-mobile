// packages/ui/test/components/genreGradient.test.ts
//
// Tests for the genre bar's gradient.
//
// Tested:
// - genreGradient
//
// What is covered:
// - a known slug, the fallback for an unknown slug and for a prototype key
//
// Run with: pnpm --filter @beatly/ui test -- genreGradient
//
// SEE: packages/ui/src/components/genreGradient.ts

import { describe, expect, it } from "@jest/globals";

import { genreGradient } from "../../src/components/genreGradient.ts";
import { genrePalette } from "../../src/tokens/palette.ts";

describe("genreGradient", () => {
  it("returns the palette entry of a known slug", () => {
    expect(genreGradient("pop")).toBe(genrePalette.pop);
  });

  it("returns the fallback for a slug without an entry", () => {
    expect(genreGradient("unknown")).toBe(genrePalette.fallback);
  });

  it("returns the fallback for a prototype key", () => {
    expect(genreGradient("constructor")).toBe(genrePalette.fallback);
  });
});

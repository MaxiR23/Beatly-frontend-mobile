// packages/ui/test/components/avatarIdentity.test.ts
//
// Tests for the avatar's initials and gradient.
//
// Tested:
// - initialsOf
// - avatarGradient
//
// What is covered:
// - two initials at most, upper case, empty for no name, whole surrogate pairs, a stable palette entry
//
// Run with: pnpm --filter @beatly/ui test -- avatarIdentity
//
// SEE: packages/ui/src/components/avatarIdentity.ts

import { describe, expect, it } from "@jest/globals";

import { avatarGradient, initialsOf } from "../../src/components/avatarIdentity.ts";
import { avatarPalette } from "../../src/tokens/palette.ts";

describe("initialsOf", () => {
  it("takes the first letter of the first two words", () => {
    expect(initialsOf("Max Reb")).toBe("MR");
    expect(initialsOf("  ana  maría  lópez ")).toBe("AM");
  });

  it("takes one letter from a single word", () => {
    expect(initialsOf("maxi_23")).toBe("M");
  });

  it("upper-cases the letters", () => {
    expect(initialsOf("ana pérez")).toBe("AP");
  });

  it("is empty for no name or a blank one", () => {
    expect(initialsOf(null)).toBe("");
    expect(initialsOf("   ")).toBe("");
  });

  it("keeps a surrogate-pair first character whole", () => {
    expect(initialsOf("\u{1D504}bc")).toBe("\u{1D504}");
  });
});

describe("avatarGradient", () => {
  it("returns the same pair for the same name", () => {
    expect(avatarGradient("Max Reb")).toBe(avatarGradient("Max Reb"));
  });

  it("returns the legacy palette entry for a known name", () => {
    // "ab": h = (0 * 31 + 97) * 31 + 98 = 3105; 3105 % 8 = 1
    expect(avatarGradient("ab")).toBe(avatarPalette[1]);
  });

  it("returns a palette entry for no name", () => {
    expect(avatarGradient(null)).toBe(avatarPalette[0]);
  });
});

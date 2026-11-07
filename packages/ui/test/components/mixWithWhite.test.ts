// packages/ui/test/components/mixWithWhite.test.ts
//
// Tests for the color mix with white.
//
// Tested:
// - mixWithWhite
//
// What is covered:
// - a share of 0 keeps the color, 1 gives white
// - channels rounded and written as padded lowercase #rrggbb
// - the tab indicator token as the share
//
// Run with: pnpm --filter @beatly/ui test -- mixWithWhite
//
// SEE: packages/ui/src/components/mixWithWhite.ts

import { describe, expect, it } from "@jest/globals";

import { mixWithWhite } from "../../src/components/mixWithWhite.ts";
import { color } from "../../src/tokens/color.ts";

describe("mixWithWhite", () => {
  it("keeps the color at a share of 0", () => {
    expect(mixWithWhite("#336699", 0)).toBe("#336699");
  });

  it("gives white at a share of 1", () => {
    expect(mixWithWhite("#336699", 1)).toBe("#ffffff");
  });

  it("rounds a half channel up", () => {
    expect(mixWithWhite("#000000", 0.5)).toBe("#808080");
  });

  it("mixes each channel toward 255", () => {
    expect(mixWithWhite("#336699", 0.5)).toBe("#99b3cc");
  });

  it("writes lowercase padded channels", () => {
    expect(mixWithWhite("#0a0b0c", 0.25)).toBe("#474849");
  });

  it("uses the tab indicator share of the token", () => {
    expect(mixWithWhite("#336699", color.mix.tabIndicator)).toBe("#99b3cc");
  });
});

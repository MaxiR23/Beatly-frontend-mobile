// apps/mobile/test/navigationTheme.test.ts
//
// Tests for the navigation theme.
//
// Tested:
// - navigationTheme
//
// What is covered:
// - the background and card in the base surface, a dark theme, every color from tokens
//
// Run with: pnpm --filter @beatly/mobile test -- navigationTheme
//
// SEE: apps/mobile/src/navigationTheme.ts

import { color } from "@beatly/ui";
import { describe, expect, it } from "@jest/globals";

import { navigationTheme } from "../src/navigationTheme.ts";

const tokenValues = new Set<string>(
  [
    ...Object.values(color.surface),
    ...Object.values(color.text),
    ...Object.values(color.accent),
    ...Object.values(color.status),
    ...Object.values(color.overlay),
  ].map(String),
);

describe("navigationTheme", () => {
  it("paints every navigator's background and card in the base surface", () => {
    expect(navigationTheme.dark).toBe(true);
    expect(navigationTheme.colors.background).toBe(color.surface.base);
    expect(navigationTheme.colors.card).toBe(color.surface.base);
  });

  it("takes every navigation color from tokens", () => {
    for (const value of Object.values(navigationTheme.colors)) {
      expect(tokenValues.has(String(value))).toBe(true);
    }
  });
});

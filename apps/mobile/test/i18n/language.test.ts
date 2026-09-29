// apps/mobile/test/i18n/language.test.ts
//
// Tests for the device language resolution.
//
// Tested:
// - resolveLanguage
//
// What is covered:
// - es and en, uppercase codes, and the fallback to en
//
// Run with: pnpm --filter @beatly/mobile test -- language
//
// SEE: apps/mobile/src/i18n/language.ts

import { describe, expect, it } from "@jest/globals";

import { resolveLanguage } from "../../src/i18n/language.ts";

describe("resolveLanguage", () => {
  it("resolves es to es", () => {
    expect(resolveLanguage("es")).toBe("es");
  });

  it("resolves en to en", () => {
    expect(resolveLanguage("en")).toBe("en");
  });

  it("resolves an uppercase code", () => {
    expect(resolveLanguage("ES")).toBe("es");
  });

  it("falls back to en for an unsupported language", () => {
    expect(resolveLanguage("fr")).toBe("en");
  });

  it("falls back to en when the device reports no language", () => {
    expect(resolveLanguage(null)).toBe("en");
    expect(resolveLanguage(undefined)).toBe("en");
  });
});

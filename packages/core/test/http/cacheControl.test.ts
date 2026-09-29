// packages/core/test/http/cacheControl.test.ts
//
// Tests for the Cache-Control parser.
//
// Tested:
// - parseMaxAge
//
// What is covered:
// - max-age, absent, no-cache, no-store, case, s-maxage, malformed and negative values
//
// Run with: pnpm --filter @beatly/core test -- cacheControl
//
// SEE: packages/core/src/http/cacheControl.ts

import { describe, expect, it } from "vitest";

import { parseMaxAge } from "../../src/http/cacheControl.ts";

describe("parseMaxAge", () => {
  it("reads max-age", () => {
    expect(parseMaxAge("max-age=60")).toBe(60);
  });

  it("returns zero when the header is absent", () => {
    expect(parseMaxAge(undefined)).toBe(0);
  });

  it("returns zero for no-cache", () => {
    expect(parseMaxAge("no-cache")).toBe(0);
  });

  it("returns zero for no-store even with a max-age beside it", () => {
    expect(parseMaxAge("no-store, max-age=60")).toBe(0);
  });

  it("reads max-age among other directives", () => {
    expect(parseMaxAge("private, max-age=120")).toBe(120);
  });

  it("matches the directive name case-insensitively", () => {
    expect(parseMaxAge("Max-Age=30")).toBe(30);
  });

  it("does not read s-maxage as max-age", () => {
    expect(parseMaxAge("s-maxage=100")).toBe(0);
  });

  it("returns zero for a malformed max-age", () => {
    expect(parseMaxAge("max-age=abc")).toBe(0);
  });

  it("returns zero for a negative max-age", () => {
    expect(parseMaxAge("max-age=-5")).toBe(0);
  });
});

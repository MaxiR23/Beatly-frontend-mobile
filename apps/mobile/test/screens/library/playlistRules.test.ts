// apps/mobile/test/screens/library/playlistRules.test.ts
//
// Tests for the create-playlist rules.
//
// Tested:
// - titleLength
// - isTitleTooLong
// - canCreatePlaylist
//
// What is covered:
// - the 1 and 200 character boundaries, whitespace-only titles, trimming and code point counting
//
// Run with: pnpm --filter @beatly/mobile test -- playlistRules
//
// SEE: apps/mobile/src/screens/library/playlistRules.ts

import { describe, expect, it } from "@jest/globals";

import {
  canCreatePlaylist,
  isTitleTooLong,
  titleLength,
} from "../../../src/screens/library/playlistRules.ts";

describe("canCreatePlaylist", () => {
  it("is false for an empty or whitespace-only title", () => {
    expect(canCreatePlaylist("")).toBe(false);
    expect(canCreatePlaylist("   ")).toBe(false);
  });

  it("is true from 1 to 200 characters", () => {
    expect(canCreatePlaylist("a")).toBe(true);
    expect(canCreatePlaylist("a".repeat(200))).toBe(true);
  });

  it("is false at 201 characters", () => {
    expect(canCreatePlaylist("a".repeat(201))).toBe(false);
  });
});

describe("isTitleTooLong", () => {
  it("is true only above 200 characters", () => {
    expect(isTitleTooLong("a".repeat(200))).toBe(false);
    expect(isTitleTooLong("a".repeat(201))).toBe(true);
  });
});

describe("titleLength", () => {
  it("counts code points, not UTF-16 units", () => {
    expect(titleLength("😀".repeat(200))).toBe(200);
    expect(canCreatePlaylist("😀".repeat(200))).toBe(true);
  });

  it("trims surrounding spaces before counting", () => {
    expect(titleLength("  ab  ")).toBe(2);
    expect(isTitleTooLong(` ${"a".repeat(200)} `)).toBe(false);
  });
});

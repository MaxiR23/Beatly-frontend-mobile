// apps/mobile/test/screens/search/formatDuration.test.ts
//
// Tests for the duration formatter.
//
// Tested:
// - formatDuration
//
// What is covered:
// - m:ss under an hour and h:mm:ss from an hour
//
// Run with: pnpm --filter @beatly/mobile test -- formatDuration
//
// SEE: apps/mobile/src/screens/search/formatDuration.ts

import { describe, expect, it } from "@jest/globals";

import { formatDuration } from "../../../src/screens/search/formatDuration.ts";

describe("formatDuration", () => {
  it.each([
    [0, "0:00"],
    [59, "0:59"],
    [225, "3:45"],
    [3600, "1:00:00"],
    [3725, "1:02:05"],
  ])("formats %d seconds as %s", (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });
});

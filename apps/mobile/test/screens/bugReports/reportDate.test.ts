// apps/mobile/test/screens/bugReports/reportDate.test.ts
//
// Tests for the report date helper.
//
// Tested:
// - reportDate
//
// What is covered:
// - a timestamp with microseconds and an offset, one with Z, and a value that is not a date
//
// Run with: pnpm --filter @beatly/mobile test -- reportDate
//
// SEE: apps/mobile/src/screens/bugReports/reportDate.ts

import { describe, expect, it } from "@jest/globals";

import { reportDate } from "../../../src/screens/bugReports/reportDate.ts";

describe("reportDate", () => {
  it("reads a timestamp with microseconds and an offset", () => {
    expect(reportDate("2026-10-01T10:00:00.123456+00:00")?.getTime()).toBe(
      Date.UTC(2026, 9, 1, 10, 0, 0, 123),
    );
  });

  it("reads a timestamp with Z", () => {
    expect(reportDate("2026-10-01T10:00:00Z")?.getTime()).toBe(Date.UTC(2026, 9, 1, 10, 0, 0));
  });

  it("returns null for a value that is not a date", () => {
    expect(reportDate("not a date")).toBeNull();
  });
});

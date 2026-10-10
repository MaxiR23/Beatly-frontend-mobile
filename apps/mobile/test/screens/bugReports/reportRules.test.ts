// apps/mobile/test/screens/bugReports/reportRules.test.ts
//
// Tests for the report form's rules.
//
// Tested:
// - descriptionLength, descriptionProblem, showsCounter, canSendReport
//
// What is covered:
// - the trimmed length in code points, no problem while empty, too short and too long, the exact bounds
// - the counter from 1800, sending needing a category and a valid description
//
// Run with: pnpm --filter @beatly/mobile test -- reportRules
//
// SEE: apps/mobile/src/screens/bugReports/reportRules.ts

import { describe, expect, it } from "@jest/globals";

import {
  canSendReport,
  descriptionLength,
  descriptionProblem,
  showsCounter,
} from "../../../src/screens/bugReports/reportRules.ts";

describe("the report rules", () => {
  it("counts the trimmed description in code points", () => {
    expect(descriptionLength("  héllo  ")).toBe(5);
    expect(descriptionLength("😀")).toBe(1);
  });

  it("has no problem while the description is empty", () => {
    expect(descriptionProblem("")).toBeNull();
    expect(descriptionProblem("   ")).toBeNull();
  });

  it("is too short below 5 trimmed characters", () => {
    expect(descriptionProblem("  abcd  ")).toBe("tooShort");
  });

  it("is too long above 2000", () => {
    expect(descriptionProblem("a".repeat(2001))).toBe("tooLong");
  });

  it("allows 5 and 2000", () => {
    expect(descriptionProblem("abcde")).toBeNull();
    expect(descriptionProblem("a".repeat(2000))).toBeNull();
  });

  it("shows the counter from 1800 and not at 1799", () => {
    expect(showsCounter("a".repeat(1799))).toBe(false);
    expect(showsCounter("a".repeat(1800))).toBe(true);
  });

  it("cannot send without a category, even with a valid description", () => {
    expect(canSendReport(null, "abcde")).toBe(false);
    expect(canSendReport("ui", "abcde")).toBe(true);
  });

  it("cannot send a description that is only spaces", () => {
    expect(canSendReport("ui", "         ")).toBe(false);
  });
});

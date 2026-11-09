// apps/mobile/test/screens/connection/playStart.test.ts
//
// Tests for the play-start failure store.
//
// Tested:
// - failPlayStart, clearPlayStart, retryPlayStart, getPlayStartFailure
//
// What is covered:
// - clearing with another owner keeps the failure, with its owner clears it
// - retrying clears the failure before it runs the retry
//
// Run with: pnpm --filter @beatly/mobile test -- playStart
//
// SEE: apps/mobile/src/screens/connection/playStart.ts

import { afterEach, describe, expect, it, jest } from "@jest/globals";

import {
  clearPlayStart,
  failPlayStart,
  getPlayStartFailure,
  retryPlayStart,
} from "../../../src/screens/connection/playStart.ts";

afterEach(() => {
  retryPlayStart();
});

describe("playStart", () => {
  it("keeps the failure when another owner clears", () => {
    failPlayStart({ owner: "p1", sourceStart: 3, retry: () => undefined });
    clearPlayStart("p2");
    expect(getPlayStartFailure()?.owner).toBe("p1");
  });

  it("clears the failure for its owner", () => {
    failPlayStart({ owner: "p1", sourceStart: 3, retry: () => undefined });
    clearPlayStart("p1");
    expect(getPlayStartFailure()).toBeNull();
  });

  it("clears the failure before it runs the retry", () => {
    let seen: unknown = "unset";
    const retry = jest.fn(() => {
      seen = getPlayStartFailure();
    });
    failPlayStart({ owner: "p1", sourceStart: 3, retry });
    retryPlayStart();
    expect(retry).toHaveBeenCalledTimes(1);
    expect(seen).toBeNull();
  });

  it("does nothing to retry without a failure", () => {
    expect(() => {
      retryPlayStart();
    }).not.toThrow();
  });
});

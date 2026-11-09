// apps/mobile/test/screens/connection/bottomStatusOf.test.ts
//
// Tests for the choice of the bottom status strip.
//
// Tested:
// - bottomStatusOf
//
// What is covered:
// - every combination of online or offline with each playback failure and none
// - offline with any failure gives exactly the offline playback strip, so there is one strip only
// - a play-all that could not start gives the offline playback strip online or offline, with or without a failure
//
// Run with: pnpm --filter @beatly/mobile test -- bottomStatusOf
//
// SEE: apps/mobile/src/screens/connection/bottomStatus.ts

import type { PlaybackFailure } from "@beatly/core";
import { describe, expect, it } from "@jest/globals";

import { bottomStatusOf } from "../../../src/screens/connection/bottomStatus.ts";

const failures: PlaybackFailure[] = [
  "unplayable",
  "timeout",
  "network",
  "invalid_response",
  "playback",
];

describe("bottomStatusOf", () => {
  it("shows nothing online with no failure", () => {
    expect(bottomStatusOf(true, null)).toBeNull();
  });

  it("shows the offline strip when offline with no failure", () => {
    expect(bottomStatusOf(false, null)).toBe("offline");
  });

  it.each([
    ["network", "playbackOffline"],
    ["timeout", "playbackSlow"],
    ["unplayable", "playbackFailed"],
    ["invalid_response", "playbackFailed"],
    ["playback", "playbackFailed"],
  ] as const)("shows the reason of a %s failure while online", (failure, expected) => {
    expect(bottomStatusOf(true, failure)).toBe(expected);
  });

  it.each(failures)(
    "shows exactly one offline playback strip offline with a %s failure",
    (failure) => {
      expect(bottomStatusOf(false, failure)).toBe("playbackOffline");
    },
  );

  it.each([true, false])(
    "shows the offline playback strip for a failed start (online %s)",
    (online) => {
      expect(bottomStatusOf(online, null, true)).toBe("playbackOffline");
      for (const failure of failures) {
        expect(bottomStatusOf(online, failure, true)).toBe("playbackOffline");
      }
    },
  );
});

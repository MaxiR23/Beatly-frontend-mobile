// apps/mobile/test/screens/onboarding/onboardingRules.test.ts
//
// Tests for the onboarding's pick rules.
//
// Tested:
// - togglePick, pickButton, nextSimilarRequest, similarExcludeIds
//
// What is covered:
// - the pick order, removing a picked artist, the 20 limit
// - the bottom button for 0, 4, 5 and 20 picks
// - the next pick to ask for its similar artists, and the ids it excludes (in order, each once, failed answers adding none)
//
// Run with: pnpm --filter @beatly/mobile test -- onboardingRules
//
// SEE: apps/mobile/src/screens/onboarding/onboardingRules.ts

import { describe, expect, it } from "@jest/globals";

import {
  nextSimilarRequest,
  pickButton,
  similarExcludeIds,
  togglePick,
  type PickedArtist,
  type SimilarAnswer,
} from "../../../src/screens/onboarding/onboardingRules.ts";

const artist = (n: number): PickedArtist => ({
  id: `UC${String(n)}`,
  name: `Artist ${String(n)}`,
  image: null,
});

describe("togglePick", () => {
  it("adds an artist at the end, in pick order", () => {
    const picked = togglePick(togglePick([], artist(2)), artist(1));
    expect(picked.map((item) => item.id)).toEqual(["UC2", "UC1"]);
  });

  it("removes a picked one", () => {
    const picked = togglePick([artist(1), artist(2)], artist(1));
    expect(picked.map((item) => item.id)).toEqual(["UC2"]);
  });

  it("does not add a 21st artist", () => {
    const twenty = Array.from({ length: 20 }, (_, index) => artist(index));
    expect(togglePick(twenty, artist(99))).toBe(twenty);
  });

  it("still removes a picked one at the limit", () => {
    const twenty = Array.from({ length: 20 }, (_, index) => artist(index));
    expect(togglePick(twenty, artist(3))).toHaveLength(19);
  });
});

describe("pickButton", () => {
  it("reads how many are missing below five", () => {
    expect(pickButton(0)).toEqual({ kind: "more", n: 5 });
    expect(pickButton(4)).toEqual({ kind: "more", n: 1 });
  });

  it("continues with the count from five", () => {
    expect(pickButton(5)).toEqual({ kind: "continue", n: 5 });
    expect(pickButton(20)).toEqual({ kind: "continue", n: 20 });
  });
});

describe("nextSimilarRequest", () => {
  it("is the first picked artist without an answer, in pick order", () => {
    expect(nextSimilarRequest(["UC2", "UC1"], [])).toBe("UC2");
  });

  it("skips answered and failed artists and is null when all are answered", () => {
    const answers: SimilarAnswer[] = [
      { id: "UC2", kind: "failed" },
      { id: "UC1", kind: "artists", artists: [] },
    ];
    expect(nextSimilarRequest(["UC2", "UC1", "UC3"], answers)).toBe("UC3");
    expect(nextSimilarRequest(["UC2", "UC1"], answers)).toBeNull();
    expect(nextSimilarRequest([], [])).toBeNull();
  });
});

describe("similarExcludeIds", () => {
  it("lists the curated, the search result, the picked and the answered artists in that order", () => {
    const ids = similarExcludeIds({
      curated: [{ id: "C1" }, { id: "C2" }],
      found: { id: "F1" },
      picked: [artist(1)],
      answers: [{ id: "UC1", kind: "artists", artists: [artist(8), artist(9)] }],
    });
    expect(ids).toEqual(["C1", "C2", "F1", "UC1", "UC8", "UC9"]);
  });

  it("sends each id once when a picked artist is also curated, found or similar", () => {
    const ids = similarExcludeIds({
      curated: [{ id: "UC1" }, { id: "UC2" }],
      found: { id: "UC1" },
      picked: [artist(1), artist(2)],
      answers: [{ id: "UC1", kind: "artists", artists: [artist(2), artist(3)] }],
    });
    expect(ids).toEqual(["UC1", "UC2", "UC3"]);
  });

  it("leaves out a failed answer and a missing search result", () => {
    const ids = similarExcludeIds({
      curated: [{ id: "C1" }],
      found: null,
      picked: [],
      answers: [{ id: "UC1", kind: "failed" }],
    });
    expect(ids).toEqual(["C1"]);
  });
});

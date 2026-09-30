// apps/mobile/test/screens/player/queue.test.ts
//
// Tests for the queue helper.
//
// Tested:
// - toQueue
//
// What is covered:
// - the index skipping the unplayable items before the tapped one, an unplayable tapped item
//
// Run with: pnpm --filter @beatly/mobile test -- screens/player/queue
//
// SEE: apps/mobile/src/screens/player/queue.ts

import type { PlayableTrack } from "@beatly/core";
import { describe, expect, it } from "@jest/globals";

import { toQueue } from "../../../src/screens/player/queue.ts";

const items = [
  { id: "a", ok: true },
  { id: "b", ok: false },
  { id: "c", ok: true },
];
const toPlayable = (item: { id: string; ok: boolean }): PlayableTrack | null =>
  item.ok
    ? { trackId: item.id, title: item.id, artists: [], coverUrl: null, durationSeconds: null }
    : null;

describe("toQueue", () => {
  it("drops the unplayable items and moves the index past the ones before the tapped", () => {
    const queue = toQueue(items, 2, toPlayable);
    expect(queue?.tracks.map((t) => t.trackId)).toEqual(["a", "c"]);
    expect(queue?.index).toBe(1);
  });

  it("returns null when the tapped item is not playable", () => {
    expect(toQueue(items, 1, toPlayable)).toBeNull();
  });

  it("returns null for an empty list", () => {
    expect(toQueue([], 0, toPlayable)).toBeNull();
  });
});

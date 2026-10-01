// apps/mobile/test/screens/player/queue.test.ts
//
// Tests for the queue helper.
//
// Tested:
// - toQueue, playableOf
//
// What is covered:
// - the index skipping the unplayable items before the tapped one, an unplayable tapped item
// - a track of the up next or related routes mapped to a playable track, with its nulls kept
//
// Run with: pnpm --filter @beatly/mobile test -- screens/player/queue
//
// SEE: apps/mobile/src/screens/player/queue.ts

import type { PlayableTrack } from "@beatly/core";
import { describe, expect, it } from "@jest/globals";

import { playableOf, toQueue } from "../../../src/screens/player/queue.ts";

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

describe("playableOf", () => {
  it("maps a track of the up next or related routes to a playable track", () => {
    expect(
      playableOf({
        track_id: "t1",
        title: "Song",
        artists: [
          { id: "a1", name: "Ann" },
          { id: "a2", name: "Bob" },
        ],
        album: "Album",
        album_id: "al1",
        duration_seconds: 200,
        thumbnail_url: "test://img/t1",
      }),
    ).toEqual({
      trackId: "t1",
      title: "Song",
      artists: ["Ann", "Bob"],
      coverUrl: "test://img/t1",
      durationSeconds: 200,
    });
  });

  it("keeps a null cover and duration", () => {
    expect(
      playableOf({
        track_id: "t1",
        title: "Song",
        artists: [],
        album: null,
        album_id: null,
        duration_seconds: null,
        thumbnail_url: null,
      }),
    ).toEqual({ trackId: "t1", title: "Song", artists: [], coverUrl: null, durationSeconds: null });
  });
});

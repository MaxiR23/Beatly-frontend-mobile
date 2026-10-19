// apps/mobile/test/screens/player/queue.test.ts
//
// Tests for the queue helper.
//
// Tested:
// - toQueue, wholeQueue, playableOf, suggestionsOf
//
// What is covered:
// - the index skipping the unplayable items before the tapped one, an unplayable tapped item
// - wholeQueue keeping the playable items in order, starting at the first or at a random one, null with none
// - a track of the up next or related routes mapped to a playable track, with its artist refs and album, and its nulls kept
// - the suggestions of an up next answer without the first track, in order, none for an empty list or only the requested track
//
// Run with: pnpm --filter @beatly/mobile test -- screens/player/queue
//
// SEE: apps/mobile/src/screens/player/queue.ts

import type { PlayableTrack } from "@beatly/core";
import { describe, expect, it } from "@jest/globals";

import { upNextFixture } from "../../helpers/core.tsx";
import {
  playableOf,
  suggestionsOf,
  toQueue,
  wholeQueue,
} from "../../../src/screens/player/queue.ts";

const items = [
  { id: "a", ok: true },
  { id: "b", ok: false },
  { id: "c", ok: true },
];
const toPlayable = (item: { id: string; ok: boolean }): PlayableTrack | null =>
  item.ok
    ? {
        trackId: item.id,
        title: item.id,
        artists: [],
        album: null,
        albumId: null,
        coverUrl: null,
        durationSeconds: null,
      }
    : null;

describe("wholeQueue", () => {
  it("starts at index 0 without the unplayable items", () => {
    const queue = wholeQueue(items, toPlayable, "first");
    expect(queue?.tracks.map((t) => t.trackId)).toEqual(["a", "c"]);
    expect(queue?.index).toBe(0);
  });

  it("picks floor(random * n) among the playable items", () => {
    expect(wholeQueue(items, toPlayable, "random", () => 0.99)?.index).toBe(1);
    expect(wholeQueue(items, toPlayable, "random", () => 0)?.index).toBe(0);
  });

  it("returns null with no playable item", () => {
    expect(wholeQueue([{ id: "b", ok: false }], toPlayable, "first")).toBeNull();
    expect(wholeQueue([], toPlayable, "random")).toBeNull();
  });
});

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
      artists: [
        { id: "a1", name: "Ann" },
        { id: "a2", name: "Bob" },
      ],
      album: "Album",
      albumId: "al1",
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
    ).toEqual({
      trackId: "t1",
      title: "Song",
      artists: [],
      album: null,
      albumId: null,
      coverUrl: null,
      durationSeconds: null,
    });
  });
});

describe("suggestionsOf", () => {
  it("maps the suggestions without the first track, in order", () => {
    const suggestions = suggestionsOf(upNextFixture);
    expect(suggestions.map((t) => t.trackId)).toEqual(["u2", "u3"]);
    expect(suggestions).toEqual(upNextFixture.tracks.slice(1).map(playableOf));
  });

  it("returns no suggestions for an empty list or only the requested track", () => {
    expect(suggestionsOf({ tracks: [] })).toEqual([]);
    expect(suggestionsOf({ tracks: upNextFixture.tracks.slice(0, 1) })).toEqual([]);
  });
});

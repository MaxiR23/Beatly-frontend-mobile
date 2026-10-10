// apps/mobile/test/screens/trackMenu/trackMenuItems.test.ts
//
// Tests for the track menu items.
//
// Tested:
// - trackMenuItems
//
// What is covered:
// - all seven items in order for a full track in an own playlist, unlike when liked
// - like and add hidden without album or cover, add hidden without a duration
// - go to artist with the first artist that has an id, go to album hidden without an album id
// - remove hidden outside an own playlist, credits always offered, report a problem always offered and last
//
// Run with: pnpm --filter @beatly/mobile test -- trackMenuItems
//
// SEE: apps/mobile/src/screens/trackMenu/trackMenuItems.ts

import type { PlayableTrack } from "@beatly/core";
import { describe, expect, it } from "@jest/globals";

import { trackMenuItems } from "../../../src/screens/trackMenu/trackMenuItems.ts";

const full: PlayableTrack = {
  trackId: "t1",
  title: "Song",
  artists: [
    { id: null, name: "Guest" },
    { id: "ar1", name: "Ann" },
  ],
  album: "Album",
  albumId: "al1",
  coverUrl: "test://img/t1",
  durationSeconds: 200,
};

const keys = (track: PlayableTrack, ctx = { liked: false, ownPlaylistId: null as string | null }) =>
  trackMenuItems(track, ctx).map((item) => item.key);

describe("trackMenuItems", () => {
  it("offers all seven in order for a full track in an own playlist", () => {
    expect(keys(full, { liked: false, ownPlaylistId: "p1" })).toEqual([
      "like",
      "addToPlaylist",
      "goToArtist",
      "goToAlbum",
      "credits",
      "removeFromPlaylist",
      "report",
    ]);
  });

  it("marks only the remove item destructive", () => {
    const items = trackMenuItems(full, { liked: false, ownPlaylistId: "p1" });
    expect(items.filter((item) => item.destructive).map((item) => item.key)).toEqual([
      "removeFromPlaylist",
    ]);
  });

  it("offers unlike when liked", () => {
    expect(keys(full, { liked: true, ownPlaylistId: null })[0]).toBe("unlike");
  });

  it("hides like and add without album or cover", () => {
    expect(keys({ ...full, album: null, albumId: null, coverUrl: null })).toEqual([
      "goToArtist",
      "credits",
      "report",
    ]);
    expect(keys({ ...full, coverUrl: null })).toEqual([
      "goToArtist",
      "goToAlbum",
      "credits",
      "report",
    ]);
  });

  it("hides add without a duration but keeps like", () => {
    expect(keys({ ...full, durationSeconds: null })).toEqual([
      "like",
      "goToArtist",
      "goToAlbum",
      "credits",
      "report",
    ]);
  });

  it("goes to the first artist with an id", () => {
    const item = trackMenuItems(full, { liked: false, ownPlaylistId: null }).find(
      (candidate) => candidate.key === "goToArtist",
    );
    expect(item?.artistId).toBe("ar1");
  });

  it("hides go to artist when no artist has an id", () => {
    expect(keys({ ...full, artists: [{ id: null, name: "Guest" }] })).not.toContain("goToArtist");
  });

  it("hides go to album without an album id", () => {
    expect(keys({ ...full, albumId: null })).not.toContain("goToAlbum");
  });

  it("hides remove outside an own playlist", () => {
    expect(keys(full)).not.toContain("removeFromPlaylist");
  });

  it("always offers credits", () => {
    expect(keys({ ...full, artists: [], album: null, albumId: null, coverUrl: null })).toEqual([
      "credits",
      "report",
    ]);
  });

  it("always offers report a problem, last", () => {
    const bare = { ...full, artists: [], album: null, albumId: null, coverUrl: null };
    for (const [track, ctx] of [
      [full, { liked: false, ownPlaylistId: "p1" }],
      [bare, { liked: false, ownPlaylistId: null }],
      [full, { liked: true, ownPlaylistId: null }],
    ] as const) {
      expect(keys(track, ctx).at(-1)).toBe("report");
    }
  });
});

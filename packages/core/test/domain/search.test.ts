// packages/core/test/domain/search.test.ts
//
// Tests for the track artists rule and the album artist reference.
//
// Tested:
// - trackArtistsSchema, searchSongSchema's artists, searchAlbumSchema's artists
//
// What is covered:
// - a primary artist with an id and a secondary with id null are accepted
// - an empty list, a first artist with id null, "" or no id key are rejected
// - album artists accept an id null first and an empty list
//
// Run with: pnpm --filter @beatly/core test -- domain/search
//
// SEE: packages/core/src/domain/search.ts

import { describe, expect, it } from "vitest";

import { searchAlbumSchema, trackArtistsSchema } from "../../src/domain/search.ts";

describe("trackArtistsSchema", () => {
  it("accepts a secondary artist with id null", () => {
    const input = [
      { id: "ar1", name: "Ann" },
      { id: null, name: "Guest" },
    ];
    const result = trackArtistsSchema.safeParse(input);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(input);
  });

  it.each([
    ["null", null],
    ["empty", ""],
  ])("rejects a first artist whose id is %s", (_name, id) => {
    const result = trackArtistsSchema.safeParse([
      { id, name: "Ann" },
      { id: "ar2", name: "Bob" },
    ]);
    expect(result.success).toBe(false);
  });

  it("rejects a first artist without the id key", () => {
    expect(trackArtistsSchema.safeParse([{ name: "Ann" }]).success).toBe(false);
  });

  it("rejects an empty list", () => {
    expect(trackArtistsSchema.safeParse([]).success).toBe(false);
  });
});

describe("searchAlbumSchema", () => {
  const album = { id: "al1", title: "Album", year: null, thumbnail_url: null, image: null };

  it("keeps album artists on the old rule", () => {
    const empty = { ...album, artists: [] };
    const nullFirst = { ...album, artists: [{ id: null, name: "Various" }] };
    const first = searchAlbumSchema.safeParse(empty);
    const second = searchAlbumSchema.safeParse(nullFirst);
    expect(first.success).toBe(true);
    expect(first.data).toEqual(empty);
    expect(second.success).toBe(true);
    expect(second.data).toEqual(nullFirst);
  });
});

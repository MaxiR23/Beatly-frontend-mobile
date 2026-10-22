// packages/core/test/domain/image.test.ts
//
// Tests for the image tiers in every schema the contract tiers.
//
// Tested:
// - imageTiersSchema and the image / mosaic of every extended schema
//
// What is covered:
// - each schema parses image with its three tiers and image null; each mosaic schema parses a list of tiers and []
// - a missing image or mosaic, and a tier that is not a string, fail
// - recents metadata.image reads a value, null, and a malformed value as absent
//
// Run with: pnpm --filter @beatly/core test -- domain/image
//
// SEE: packages/core/src/domain/image.ts

import { describe, expect, it } from "vitest";
import { z, type ZodType } from "zod";

import { recentEntitySchema } from "../../src/domain/activity.ts";
import { albumRefSchema, albumSchema } from "../../src/domain/album.ts";
import {
  artistSchema,
  artistSingleSchema,
  artistSongSchema,
  relatedArtistSchema,
} from "../../src/domain/artist.ts";
import { genrePlaylistListItemSchema } from "../../src/domain/genre.ts";
import { libraryEntrySchema, libraryItemSchema } from "../../src/domain/library.ts";
import { likeSchema } from "../../src/domain/like.ts";
import {
  playlistDetailSchema,
  playlistListItemSchema,
  playlistTrackSchema,
} from "../../src/domain/playlist.ts";
import { publicGenrePlaylistSchema } from "../../src/domain/public.ts";
import {
  searchAlbumSchema,
  searchArtistSchema,
  searchSongSchema,
} from "../../src/domain/search.ts";
import { trackRefSchema } from "../../src/domain/track.ts";
import { tiers } from "../fakes/images.ts";

const artists = [{ id: "ar1", name: "Ann" }];
const url = "test://img/x";
const albumRef = {
  id: "al1",
  title: "Album",
  artists,
  year: null,
  audio_playlist_id: null,
  thumbnail_url: url,
  image: tiers("x"),
};
const song = {
  track_id: "t1",
  title: "Song",
  artists,
  album: "Album",
  album_id: "al1",
  duration_seconds: 1,
  thumbnail_url: url,
  image: tiers("x"),
};
const playlistTrack = { ...song, position: 1 };
const relatedArtist = { id: "ar1", name: "Ann", thumbnail_url: url, image: tiers("x") };
const playlistBase = {
  id: "p1",
  owner_id: "u1",
  title: "Mix",
  description: null,
  is_public: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  thumbnail_urls: [url],
  mosaic: [tiers("x")],
};

const withImage: readonly (readonly [string, ZodType, Record<string, unknown>])[] = [
  ["albumRefSchema", albumRefSchema, albumRef],
  [
    "albumSchema",
    albumSchema,
    {
      ...albumRef,
      track_count: 1,
      duration_seconds: 1,
      tracks: [],
      other_versions: [albumRef],
      related_recommendations: [],
    },
  ],
  ["artistSongSchema", artistSongSchema, song],
  [
    "artistSingleSchema",
    artistSingleSchema,
    { id: "s1", title: "Single", year: null, type: null, thumbnail_url: url, image: tiers("x") },
  ],
  ["relatedArtistSchema", relatedArtistSchema, relatedArtist],
  [
    "artistSchema",
    artistSchema,
    { ...relatedArtist, songs: [song], albums: [albumRef], singles: [], related: [relatedArtist] },
  ],
  ["searchArtistSchema", searchArtistSchema, relatedArtist],
  ["searchSongSchema", searchSongSchema, song],
  ["searchAlbumSchema", searchAlbumSchema, albumRef],
  ["trackRefSchema", trackRefSchema, song],
  [
    "genrePlaylistListItemSchema",
    genrePlaylistListItemSchema,
    {
      id: "g1",
      title: "Hits",
      description: null,
      thumbnail_url: url,
      image: tiers("x"),
      track_count: 1,
      category: null,
      thumbnail_urls: [url],
      mosaic: [tiers("x")],
    },
  ],
  [
    "libraryEntrySchema",
    libraryEntrySchema,
    {
      kind: "album",
      id: "a1",
      title: "Album",
      thumbnail_url: url,
      image: tiers("x"),
      subtitle: null,
      source: "external",
      thumbnail_urls: [],
      mosaic: [],
    },
  ],
  [
    "libraryItemSchema",
    libraryItemSchema,
    {
      kind: "album",
      external_id: "a1",
      title: "Album",
      thumbnail_url: url,
      image: tiers("x"),
      artist: null,
      artist_id: null,
      album_id: null,
      album_name: null,
      source: "external",
      added_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
  ],
  [
    "likeSchema",
    likeSchema,
    {
      ...song,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      deleted_at: null,
    },
  ],
  ["playlistTrackSchema", playlistTrackSchema, playlistTrack],
  [
    "publicGenrePlaylistSchema",
    publicGenrePlaylistSchema,
    {
      id: "g1",
      title: "Hits",
      description: null,
      track_count: 1,
      total_duration_seconds: 1,
      thumbnails: [url],
      mosaic: [tiers("x")],
      thumbnail_url: url,
      image: tiers("x"),
      tracks: [playlistTrack],
    },
  ],
];

const withMosaic: readonly (readonly [string, ZodType, Record<string, unknown>])[] = [
  ["genrePlaylistListItemSchema", genrePlaylistListItemSchema, withImage[10]?.[2] ?? {}],
  ["libraryEntrySchema", libraryEntrySchema, withImage[11]?.[2] ?? {}],
  ["playlistListItemSchema", playlistListItemSchema, playlistBase],
  [
    "playlistDetailSchema",
    playlistDetailSchema,
    { ...playlistBase, total_count: 1, total_duration_seconds: 1 },
  ],
  ["publicGenrePlaylistSchema", publicGenrePlaylistSchema, withImage[15]?.[2] ?? {}],
];

function field(data: unknown, key: "image" | "mosaic"): unknown {
  return z.record(z.string(), z.unknown()).parse(data)[key];
}

function without(base: Record<string, unknown>, key: string): Record<string, unknown> {
  return Object.fromEntries(Object.entries(base).filter(([name]) => name !== key));
}

describe("image", () => {
  it.each(withImage)("%s parses image with its tiers", (_name, schema, base) => {
    const parsed = schema.safeParse(base);
    expect(parsed.success).toBe(true);
    expect(parsed.success && field(parsed.data, "image")).toEqual(tiers("x"));
  });

  it.each(withImage)("%s parses image null", (_name, schema, base) => {
    const parsed = schema.safeParse({ ...base, image: null });
    expect(parsed.success).toBe(true);
    expect(parsed.success && field(parsed.data, "image")).toBeNull();
  });

  it.each(withImage)("%s rejects a missing image", (_name, schema, base) => {
    expect(schema.safeParse(without(base, "image")).success).toBe(false);
  });

  it.each(withImage)("%s rejects a tier that is not a string", (_name, schema, base) => {
    expect(schema.safeParse({ ...base, image: { ...tiers("x"), large: 5 } }).success).toBe(false);
  });
});

describe("mosaic", () => {
  it.each(withMosaic)("%s parses a mosaic of tiers in order", (_name, schema, base) => {
    const mosaic = [tiers("a"), tiers("b")];
    const parsed = schema.safeParse({ ...base, mosaic });
    expect(parsed.success).toBe(true);
    expect(parsed.success && field(parsed.data, "mosaic")).toEqual(mosaic);
  });

  it.each(withMosaic)("%s parses mosaic []", (_name, schema, base) => {
    const parsed = schema.safeParse({ ...base, mosaic: [] });
    expect(parsed.success).toBe(true);
    expect(parsed.success && field(parsed.data, "mosaic")).toEqual([]);
  });

  it.each(withMosaic)("%s rejects a missing mosaic", (_name, schema, base) => {
    expect(schema.safeParse(without(base, "mosaic")).success).toBe(false);
  });
});

describe("recentEntitySchema metadata.image", () => {
  const entry = (metadata: Record<string, unknown>) => ({
    entity_type: "album",
    entity_id: "a1",
    played_at: "2026-01-01T00:00:00Z",
    metadata,
  });

  it("reads metadata.image with its tiers", () => {
    const parsed = recentEntitySchema.safeParse(entry({ image: tiers("x") }));
    expect(parsed.success && parsed.data.metadata.image).toEqual(tiers("x"));
  });

  it("reads metadata.image null", () => {
    const parsed = recentEntitySchema.safeParse(entry({ image: null }));
    expect(parsed.success && parsed.data.metadata.image).toBeNull();
  });

  it("reads a malformed metadata.image as absent and still parses the item", () => {
    const parsed = recentEntitySchema.safeParse(
      entry({ title: "Album", image: { small: 1, medium: 2, large: 3 } }),
    );
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.metadata.image).toBeUndefined();
    expect(parsed.success && parsed.data.metadata.title).toBe("Album");
  });
});

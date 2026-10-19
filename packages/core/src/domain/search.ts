// INFO: the schemas of GET /search; artists is [] and never null, a song's artists follow the track artists rule (never empty, the first has an id, any other may have a null id); an album's artists have a nullable id and can be [], artist is null when nothing matches, and its thumbnail_url is nullable; an album's playlist_id is not read, the provider leaves it out of some albums.
import { z } from "zod";

// The album artist reference (old rule: nullable id, the list may be empty).
export const searchArtistRefSchema = z.object({ id: z.string().nullable(), name: z.string() });
export type SearchArtistRef = z.infer<typeof searchArtistRefSchema>;

// The artists of a song (conventions.md, Track artists): never empty, the first one has a non-empty id, any other may have id null.
export const trackArtistRefSchema = z.object({ id: z.string().nullable(), name: z.string() });
export type TrackArtistRef = z.infer<typeof trackArtistRefSchema>;

export const trackArtistsSchema = z
  .array(trackArtistRefSchema)
  .min(1)
  .refine((artists) => (artists[0]?.id ?? "") !== "", { message: "the first artist has no id" });
export type TrackArtists = z.infer<typeof trackArtistsSchema>;

export const searchArtistSchema = z.object({
  id: z.string(),
  name: z.string(),
  thumbnail_url: z.string().nullable(),
});
export type SearchArtist = z.infer<typeof searchArtistSchema>;

export const searchSongSchema = z.object({
  track_id: z.string(),
  title: z.string(),
  artists: trackArtistsSchema,
  album: z.string(),
  album_id: z.string(),
  duration_seconds: z.number().int(),
  thumbnail_url: z.string(),
});
export type SearchSong = z.infer<typeof searchSongSchema>;

export const searchAlbumSchema = z.object({
  id: z.string(),
  title: z.string(),
  artists: z.array(searchArtistRefSchema),
  year: z.string().nullable(),
  thumbnail_url: z.string().nullable(),
});
export type SearchAlbum = z.infer<typeof searchAlbumSchema>;

export const searchResultSchema = z.object({
  artist: searchArtistSchema.nullable(),
  songs: z.array(searchSongSchema),
  albums: z.array(searchAlbumSchema),
});
export type SearchResult = z.infer<typeof searchResultSchema>;

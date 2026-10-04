// INFO: the schemas of GET /search; artists is [] and never null, an artist reference id is nullable, artist is null when nothing matches, and its thumbnail_url is nullable; an album's playlist_id is not read, the provider leaves it out of some albums.
import { z } from "zod";

export const searchArtistRefSchema = z.object({ id: z.string().nullable(), name: z.string() });
export type SearchArtistRef = z.infer<typeof searchArtistRefSchema>;

export const searchArtistSchema = z.object({
  id: z.string(),
  name: z.string(),
  thumbnail_url: z.string().nullable(),
});
export type SearchArtist = z.infer<typeof searchArtistSchema>;

export const searchSongSchema = z.object({
  track_id: z.string(),
  title: z.string(),
  artists: z.array(searchArtistRefSchema),
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

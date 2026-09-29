// INFO: the schemas of GET /album/{id}; tracks, other_versions and related_recommendations come whole, a track marked unavailable has null track_id and duration, artist ids are nullable.
import { z } from "zod";

import { searchArtistRefSchema } from "./search.ts";

export const albumTrackSchema = z.object({
  track_id: z.string().nullable(),
  title: z.string(),
  artists: z.array(searchArtistRefSchema),
  duration_seconds: z.number().int().nullable(),
  is_available: z.boolean(),
  track_number: z.number().int(),
});
export type AlbumTrack = z.infer<typeof albumTrackSchema>;

export const albumRefSchema = z.object({
  id: z.string(),
  title: z.string(),
  artists: z.array(searchArtistRefSchema),
  year: z.string().nullable(),
  audio_playlist_id: z.string().nullable(),
  thumbnail_url: z.string().nullable(),
});
export type AlbumRef = z.infer<typeof albumRefSchema>;

export const albumSchema = z.object({
  id: z.string(),
  title: z.string(),
  year: z.string().nullable(),
  artists: z.array(searchArtistRefSchema),
  track_count: z.number().int().nullable(),
  duration_seconds: z.number().int(),
  audio_playlist_id: z.string().nullable(),
  thumbnail_url: z.string().nullable(),
  tracks: z.array(albumTrackSchema),
  other_versions: z.array(albumRefSchema),
  related_recommendations: z.array(albumRefSchema),
});
export type Album = z.infer<typeof albumSchema>;

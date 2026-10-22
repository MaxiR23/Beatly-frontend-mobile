// INFO: the schemas of GET /artist/{id}; image is the tiers of thumbnail_url, null when there is none; songs, albums, singles and related come whole, an empty list is a section the provider did not send, a song without track_id is unavailable, a song's artists follow the track artists rule.
import { z } from "zod";

import { albumRefSchema } from "./album.ts";
import { trackArtistsSchema } from "./search.ts";
import { imageTiersSchema } from "./image.ts";

export const artistSongSchema = z.object({
  track_id: z.string().nullable(),
  title: z.string(),
  artists: trackArtistsSchema,
  album: z.string().nullable(),
  album_id: z.string().nullable(),
  duration_seconds: z.number().int().nullable(),
  thumbnail_url: z.string().nullable(),
  image: imageTiersSchema.nullable(),
});
export type ArtistSong = z.infer<typeof artistSongSchema>;

export const artistSingleSchema = z.object({
  id: z.string(),
  title: z.string(),
  year: z.string().nullable(),
  type: z.enum(["Single", "EP"]).nullable(),
  thumbnail_url: z.string().nullable(),
  image: imageTiersSchema.nullable(),
});
export type ArtistSingle = z.infer<typeof artistSingleSchema>;

export const relatedArtistSchema = z.object({
  id: z.string(),
  name: z.string(),
  thumbnail_url: z.string().nullable(),
  image: imageTiersSchema.nullable(),
});
export type RelatedArtist = z.infer<typeof relatedArtistSchema>;

export const artistSchema = z.object({
  id: z.string(),
  name: z.string(),
  thumbnail_url: z.string().nullable(),
  image: imageTiersSchema.nullable(),
  songs: z.array(artistSongSchema),
  albums: z.array(albumRefSchema),
  singles: z.array(artistSingleSchema),
  related: z.array(relatedArtistSchema),
});
export type Artist = z.infer<typeof artistSchema>;

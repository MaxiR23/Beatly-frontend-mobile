// INFO: the item of GET /likes and GET /likes/sync and the data of POST /likes; deleted_at is null on GET /likes and set on an unliked row of GET /likes/sync; duration_seconds can be null.
import { z } from "zod";

export const likeArtistSchema = z.object({ id: z.string(), name: z.string() });

export const likeSchema = z.object({
  track_id: z.string(),
  title: z.string(),
  // No min(1): a single legacy row must not fail a whole sync page.
  artists: z.array(likeArtistSchema),
  album: z.string(),
  album_id: z.string(),
  thumbnail_url: z.string(),
  duration_seconds: z.number().int().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
});
export type Like = z.infer<typeof likeSchema>;

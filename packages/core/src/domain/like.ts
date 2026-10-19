// INFO: the item of GET /likes and GET /likes/sync and the data of POST /likes; deleted_at is null on GET /likes and set on an unliked row of GET /likes/sync; duration_seconds can be null; both lists also carry the checkpoint; artists follow the track artists rule.
import { z } from "zod";

import { trackArtistsSchema } from "./search.ts";

export const likeSchema = z.object({
  track_id: z.string(),
  title: z.string(),
  artists: trackArtistsSchema,
  album: z.string(),
  album_id: z.string(),
  thumbnail_url: z.string(),
  duration_seconds: z.number().int().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
});
export type Like = z.infer<typeof likeSchema>;

// The server's sync point on every page of GET /likes and GET /likes/sync, sent back unchanged as `since`.
export const likesCheckpointSchema = z.object({ checkpoint: z.string() });

// INFO: a playlist as POST /playlists returns it, and the item of GET /playlists, which adds thumbnail_urls: up to four cover urls for the mosaic, [] when the playlist has none; the endpoint has no single thumbnail_url.
import { z } from "zod";

export const playlistSchema = z.object({
  id: z.string(),
  owner_id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  is_public: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Playlist = z.infer<typeof playlistSchema>;

export const playlistListItemSchema = playlistSchema.extend({
  thumbnail_urls: z.array(z.string()),
});

export type PlaylistListItem = z.infer<typeof playlistListItemSchema>;

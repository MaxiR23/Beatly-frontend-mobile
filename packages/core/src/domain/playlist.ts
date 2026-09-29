// INFO: the item of GET /playlists. thumbnail_urls holds up to four cover urls for the mosaic and is [] when the playlist has none; the endpoint has no single thumbnail_url.
import { z } from "zod";

export const playlistListItemSchema = z.object({
  id: z.string(),
  owner_id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  is_public: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  thumbnail_urls: z.array(z.string()),
});

export type PlaylistListItem = z.infer<typeof playlistListItemSchema>;

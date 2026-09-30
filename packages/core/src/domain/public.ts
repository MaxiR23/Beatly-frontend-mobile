// INFO: the schema of GET /public/genre-playlists/{id}: the header and the tracks of a genre playlist, read together.
import { z } from "zod";

import { playlistTrackSchema } from "./playlist.ts";

export const publicGenrePlaylistSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  track_count: z.number().int(),
  total_duration_seconds: z.number().int(),
  thumbnails: z.array(z.string()),
  thumbnail_url: z.string().nullable(),
  tracks: z.array(playlistTrackSchema),
});

export type PublicGenrePlaylist = z.infer<typeof publicGenrePlaylistSchema>;

// INFO: a playlist as POST /playlists returns it, and the item of GET /playlists, which adds thumbnail_urls: up to four cover urls for the mosaic, [] when the playlist has none; the endpoint has no single thumbnail_url; the detail adds total_count and total_duration_seconds to the list item (thumbnail_urls included) and serves GET /playlists/{id}; the liked playlist has the same fields without thumbnail_urls and serves GET /playlists/liked; a playlist track is the item of the three /tracks routes; owned-with-track returns the ids of the caller's playlists that hold a track.
import { z } from "zod";

import { searchArtistRefSchema } from "./search.ts";

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

export const playlistDetailSchema = playlistListItemSchema.extend({
  total_count: z.number().int(),
  total_duration_seconds: z.number().int(),
});

export type PlaylistDetail = z.infer<typeof playlistDetailSchema>;

export const likedPlaylistSchema = playlistSchema.extend({
  total_count: z.number().int(),
  total_duration_seconds: z.number().int(),
});

export type LikedPlaylist = z.infer<typeof likedPlaylistSchema>;

export const playlistTrackSchema = z.object({
  track_id: z.string(),
  title: z.string(),
  artists: z.array(searchArtistRefSchema),
  album: z.string(),
  album_id: z.string(),
  duration_seconds: z.number().int(),
  thumbnail_url: z.string(),
  position: z.number().int(),
});

export type PlaylistTrack = z.infer<typeof playlistTrackSchema>;

export const ownedPlaylistIdsSchema = z.object({ playlist_ids: z.array(z.string()) });

export type OwnedPlaylistIds = z.infer<typeof ownedPlaylistIdsSchema>;

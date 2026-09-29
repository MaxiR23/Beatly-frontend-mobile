// INFO: the items of GET /genres, GET /genres/{slug}/playlists and GET /genres/{slug}/categories. thumbnail_urls holds up to four mosaic urls and is [] when there are none; thumbnail_url is the curated cover and can be null.
import { z } from "zod";

export const genreSchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
});

export const genrePlaylistListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  thumbnail_url: z.string().nullable(),
  track_count: z.number().int(),
  category: z.string().nullable(),
  thumbnail_urls: z.array(z.string()),
});

export const genreCategorySchema = z.string();

export type Genre = z.infer<typeof genreSchema>;
export type GenrePlaylistListItem = z.infer<typeof genrePlaylistListItemSchema>;

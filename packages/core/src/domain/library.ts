// INFO: the entry of GET /library: the fixed liked entry, own playlists and saved albums and playlists. source is free text because saved items carry whatever POST /library stored; the saved state of GET /library/{kind}/{external_id} and the item POST /library returns.
import { z } from "zod";

export const libraryEntryKindSchema = z.enum(["album", "playlist"]);

export const libraryEntrySchema = z.object({
  kind: libraryEntryKindSchema,
  id: z.string(),
  title: z.string(),
  thumbnail_url: z.string().nullable(),
  subtitle: z.string().nullable(),
  source: z.string(),
  thumbnail_urls: z.array(z.string()),
});

export type LibraryEntry = z.infer<typeof libraryEntrySchema>;

export const librarySavedStateSchema = z.object({ saved: z.boolean() });
export type LibrarySavedState = z.infer<typeof librarySavedStateSchema>;

export const libraryItemSchema = z.object({
  kind: libraryEntryKindSchema,
  external_id: z.string(),
  title: z.string(),
  thumbnail_url: z.string().nullable(),
  artist: z.string().nullable(),
  artist_id: z.string().nullable(),
  album_id: z.string().nullable(),
  album_name: z.string().nullable(),
  source: z.string(),
  added_at: z.string(),
  updated_at: z.string(),
});
export type LibraryItem = z.infer<typeof libraryItemSchema>;

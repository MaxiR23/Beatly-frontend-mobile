// INFO: the entry of GET /library: the fixed liked entry, own playlists and saved albums and playlists. source is free text because saved items carry whatever POST /library stored.
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

// INFO: the item of GET /recents. metadata is free-form on the backend; only the three keys the screen draws are read, all optional, and each is read leniently: a value that is not a string is treated as absent instead of failing the page.
import { z } from "zod";

export const recentEntityTypeSchema = z.enum(["album", "artist", "playlist"]);

export const recentEntitySchema = z.object({
  entity_type: recentEntityTypeSchema,
  entity_id: z.string(),
  played_at: z.string(),
  metadata: z.object({
    title: z.string().nullish().catch(undefined),
    subtitle: z.string().nullish().catch(undefined),
    thumbnail_url: z.string().nullish().catch(undefined),
  }),
});

export type RecentEntity = z.infer<typeof recentEntitySchema>;

// INFO: the item of GET /recents and the data of POST /plays. metadata has a fixed shape on write but is not validated on read (older rows may lack title); only the keys the screen reads, all optional, and each is read leniently; a playlist item also carries kind (user, genre or liked), which picks the playlist screen's source; an absent or unknown kind is read as absent and the card is not pressable; a value that is not a string is treated as absent instead of failing the page.
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
    kind: z.enum(["user", "genre", "liked"]).nullish().catch(undefined),
  }),
});

export type RecentEntity = z.infer<typeof recentEntitySchema>;

// The data of POST /plays; the client reads none of it, so only its identity is checked.
export const playEventSchema = z.object({ track_id: z.string(), played_at: z.string() });

export type PlayEvent = z.infer<typeof playEventSchema>;

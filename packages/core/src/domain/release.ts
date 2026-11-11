// INFO: the items of GET /releases: a new release with its album id (the id of /album/{id}), its type (album, single or ep), its artists (never empty, every id a string), its 544-pixel cover and the image tiers of that cover, null when it has none.
import { z } from "zod";
import { imageTiersSchema } from "./image.ts";

export const newReleaseSchema = z.object({
  album_id: z.string(),
  title: z.string(),
  type: z.enum(["album", "single", "ep"]),
  artists: z.array(z.object({ id: z.string(), name: z.string() })),
  thumbnail_url: z.string(),
  image: imageTiersSchema.nullable(),
});

export type NewRelease = z.infer<typeof newReleaseSchema>;

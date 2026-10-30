// INFO: the schema of POST /recommendations/generate: recommended artists and albums, each with the similar_to reason and its seed.
import { z } from "zod";

import { albumRefSchema } from "./album.ts";
import { imageTiersSchema } from "./image.ts";

const recommendationSeedSchema = z.object({
  type: z.enum(["artist", "album"]),
  id: z.string(),
  name: z.string(),
  thumbnail_url: z.string().nullable(),
  image: imageTiersSchema.nullable(),
});

const recommendationReasonSchema = z.object({
  type: z.literal("similar_to"),
  seed: recommendationSeedSchema,
});

export const recommendedArtistSchema = z.object({
  id: z.string(),
  name: z.string(),
  thumbnail_url: z.string().nullable(),
  image: imageTiersSchema.nullable(),
  reason: recommendationReasonSchema,
});

export const recommendedAlbumSchema = albumRefSchema.extend({
  reason: recommendationReasonSchema,
});

export const recommendationsSchema = z.object({
  artists: z.array(recommendedArtistSchema),
  albums: z.array(recommendedAlbumSchema),
  generated_at: z.string().nullable(),
  valid_until: z.string().nullable(),
});
export type Recommendations = z.infer<typeof recommendationsSchema>;

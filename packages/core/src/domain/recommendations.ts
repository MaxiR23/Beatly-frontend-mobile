// INFO: the schema of POST /recommendations/generate: the four sections of the home (albums for you, seed sections, recommended albums and artists), each item with the similar_to reason and its seed, and the timestamps; the deprecated artists and albums lists are not read.
import { z } from "zod";

import { albumRefSchema } from "./album.ts";
import { imageTiersSchema } from "./image.ts";

export const recommendationSeedSchema = z.object({
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

export const seedSectionItemSchema = z.discriminatedUnion("type", [
  recommendedArtistSchema.extend({ type: z.literal("artist") }),
  recommendedAlbumSchema.extend({ type: z.literal("album") }),
]);

export const seedSectionSchema = z.object({
  seed: recommendationSeedSchema,
  items: z.array(seedSectionItemSchema),
});

export const recommendationsSchema = z.object({
  albums_for_you: z.array(recommendedAlbumSchema),
  seed_sections: z.array(seedSectionSchema),
  recommended_albums: z.array(recommendedAlbumSchema),
  recommended_artists: z.array(recommendedArtistSchema),
  generated_at: z.string().nullable(),
  valid_until: z.string().nullable(),
});
export type Recommendations = z.infer<typeof recommendationsSchema>;
export type RecommendedAlbum = z.infer<typeof recommendedAlbumSchema>;
export type RecommendedArtist = z.infer<typeof recommendedArtistSchema>;
export type RecommendationSeed = z.infer<typeof recommendationSeedSchema>;
export type SeedSection = z.infer<typeof seedSectionSchema>;
export type SeedSectionItem = z.infer<typeof seedSectionItemSchema>;

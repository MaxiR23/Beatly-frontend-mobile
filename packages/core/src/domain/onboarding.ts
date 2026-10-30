// INFO: the schemas of the onboarding routes: the curated artists to pick from, the similar artists of a pick and the completion of the onboarding.
import { z } from "zod";

import { imageTiersSchema } from "./image.ts";

export const onboardingArtistSchema = z.object({
  id: z.string(),
  name: z.string(),
  thumbnail_url: z.string().nullable(),
  image: imageTiersSchema.nullable(),
});
export type OnboardingArtist = z.infer<typeof onboardingArtistSchema>;

export const onboardingCompletionSchema = z.object({
  onboarding_completed_at: z.string(),
  saved: z.number().int(),
  skipped: z.array(z.string()),
});
export type OnboardingCompletion = z.infer<typeof onboardingCompletionSchema>;

// POST /onboarding/similar: up to 3 artists, the same shape as a curated one; [] when none is available.
export const onboardingSimilarSchema = z.object({ artists: z.array(onboardingArtistSchema) });
export type OnboardingSimilar = z.infer<typeof onboardingSimilarSchema>;

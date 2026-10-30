// INFO: the onboarding service: the curated artists a page at a time over the shared paginated helper, the similar artists of a pick, the completion with the picked artists, and the finish that completes and then generates the recommendations, returning the first failure.
import {
  onboardingArtistSchema,
  onboardingCompletionSchema,
  onboardingSimilarSchema,
  type OnboardingArtist,
  type OnboardingCompletion,
  type OnboardingSimilar,
} from "../domain/onboarding.ts";
import type { HttpClient } from "../http/client.ts";
import type { HttpOutcome } from "../http/outcome.ts";
import { fetchPage, type PageResult } from "../http/paginated.ts";
import type { RecommendationsService } from "./recommendations.ts";

// onboarding.md: the backend accepts 5 to 20 artists.
export const MIN_ONBOARDING_ARTISTS = 5;
export const MAX_ONBOARDING_ARTISTS = 20;

export interface OnboardingService {
  listArtists(cursor: string | null): Promise<HttpOutcome<PageResult<OnboardingArtist>>>;
  // Up to 3 artists similar to artistId, without the ids in excludeIds; [] when none is available.
  similar(artistId: string, excludeIds: readonly string[]): Promise<HttpOutcome<OnboardingSimilar>>;
  complete(artistIds: readonly string[]): Promise<HttpOutcome<OnboardingCompletion>>;
  // complete, then generate; the first failure is returned as it is; success carries complete's data.
  finish(artistIds: readonly string[]): Promise<HttpOutcome<OnboardingCompletion>>;
}

export function createOnboardingService(
  client: HttpClient,
  recommendations: RecommendationsService,
): OnboardingService {
  const complete: OnboardingService["complete"] = (artistIds) =>
    client.request({
      method: "POST",
      path: "/onboarding/complete",
      body: { artist_ids: artistIds },
      schema: onboardingCompletionSchema,
    });
  return {
    listArtists: (cursor) =>
      fetchPage(client, { path: "/onboarding/artists", item: onboardingArtistSchema, cursor }),
    similar: (artistId, excludeIds) =>
      client.request({
        method: "POST",
        path: "/onboarding/similar",
        body: { artist_id: artistId, exclude_ids: excludeIds },
        schema: onboardingSimilarSchema,
      }),
    complete,
    finish: async (artistIds) => {
      const completed = await complete(artistIds);
      if (completed.kind !== "success") return completed;
      const generated = await recommendations.generate();
      if (generated.kind !== "success") return generated;
      return completed;
    },
  };
}

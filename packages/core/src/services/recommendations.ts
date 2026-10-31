// INFO: the recommendations service: asks the backend to generate the caller's recommendations.
import { recommendationsSchema, type Recommendations } from "../domain/recommendations.ts";
import type { HttpClient } from "../http/client.ts";
import type { HttpOutcome } from "../http/outcome.ts";

export interface RecommendationsService {
  generate(): Promise<HttpOutcome<Recommendations>>;
}

export function createRecommendationsService(client: HttpClient): RecommendationsService {
  return {
    generate: () =>
      client.request({
        method: "POST",
        path: "/recommendations/generate",
        schema: recommendationsSchema,
      }),
  };
}

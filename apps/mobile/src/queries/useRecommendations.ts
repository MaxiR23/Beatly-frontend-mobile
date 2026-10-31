// INFO: the query hook of POST /recommendations/generate, which the home calls on open (the backend returns a valid stored set without regenerating); a single object that never grows; cache time from the outcome's max-age via the QueryClient (private, no-cache: stale at once).
import { useQuery } from "@tanstack/react-query";

import { useCore } from "../providers/CoreProvider.tsx";
import { OutcomeError } from "./outcomeError.ts";

export const recommendationsQueryKey = ["recommendations"] as const;

export function useRecommendations() {
  const { recommendations } = useCore();
  return useQuery({
    queryKey: recommendationsQueryKey,
    queryFn: async () => {
      const outcome = await recommendations.generate();
      if (outcome.kind !== "success") throw new OutcomeError(outcome);
      return outcome;
    },
    select: (outcome) => outcome.data,
  });
}

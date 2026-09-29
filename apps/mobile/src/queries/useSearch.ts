// INFO: the query hook of GET /search; runs only for a non-empty query, and its cache time comes from the outcome's max-age via the QueryClient.
import { useQuery } from "@tanstack/react-query";

import { useCore } from "../providers/CoreProvider.tsx";
import { OutcomeError } from "./outcomeError.ts";

export const searchQueryKey = (query: string) => ["search", query] as const;

export function useSearch(query: string) {
  const { search } = useCore();
  return useQuery({
    queryKey: searchQueryKey(query),
    enabled: query !== "",
    queryFn: async () => {
      const outcome = await search.search(query);
      if (outcome.kind !== "success") throw new OutcomeError(outcome);
      return outcome;
    },
    select: (outcome) => outcome.data,
  });
}

// INFO: local data: the outcome has no max-age, so staleTimeFor treats it as stale (a read of the device store), and the mutations write the returned list into the cache instead of refetching.
import type { RecentSearchesOutcome } from "@beatly/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useCore } from "../providers/CoreProvider.tsx";
import { OutcomeError } from "./outcomeError.ts";

export const recentSearchesQueryKey = ["recentSearches"] as const;

function unwrap(outcome: RecentSearchesOutcome): RecentSearchesOutcome {
  if (outcome.kind !== "success") throw new OutcomeError(outcome);
  return outcome;
}

export function useRecentSearches() {
  const { recentSearches } = useCore();
  return useQuery({
    queryKey: recentSearchesQueryKey,
    queryFn: async () => unwrap(await recentSearches.list()),
    select: (outcome) => (outcome.kind === "success" ? outcome.data : []),
  });
}

function useRecentMutation<V>(run: (value: V) => Promise<RecentSearchesOutcome>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (value: V) => unwrap(await run(value)),
    onSuccess: (outcome) => {
      queryClient.setQueryData(recentSearchesQueryKey, outcome);
    },
  });
}

export function useAddRecentSearch() {
  const { recentSearches } = useCore();
  return useRecentMutation((query: string) => recentSearches.add(query));
}

export function useRemoveRecentSearch() {
  const { recentSearches } = useCore();
  return useRecentMutation((query: string) => recentSearches.remove(query));
}

export function useClearRecentSearches() {
  const { recentSearches } = useCore();
  return useRecentMutation<undefined>(() => recentSearches.clear());
}

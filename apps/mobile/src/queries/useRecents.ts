// INFO: the query hook of GET /recents, a single page that never grows; its cache time comes from the outcome's max-age via the QueryClient; and the mutation of POST /recents, which refetches the recents once registered; a failure is logged.
import type { RecentInput } from "@beatly/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useCore } from "../providers/CoreProvider.tsx";
import { OutcomeError } from "./outcomeError.ts";

export const recentsQueryKey = ["recents"] as const;

export function useRecents() {
  const { activity } = useCore();
  return useQuery({
    queryKey: recentsQueryKey,
    queryFn: async () => {
      const outcome = await activity.listRecents();
      if (outcome.kind !== "success") throw new OutcomeError(outcome);
      return outcome;
    },
    select: (outcome) => outcome.data.items,
  });
}

export function useRegisterRecent() {
  const { activity, log } = useCore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RecentInput) => {
      const outcome = await activity.registerRecent(input);
      if (outcome.kind !== "success") throw new OutcomeError(outcome);
      return outcome.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: recentsQueryKey }),
    onError: (error, input) => {
      log.warn("recents.register_failed", {
        entityType: input.entity_type,
        detail: error instanceof OutcomeError ? error.message : "unknown",
      });
    },
  });
}

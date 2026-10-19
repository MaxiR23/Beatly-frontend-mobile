// INFO: the autoplay setting: local data, the outcome has no max-age, so staleTimeFor treats it as stale (a read of the device store); the mutation writes the stored value into the cache instead of refetching.
import type { AutoplayOutcome } from "@beatly/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useCore } from "../providers/CoreProvider.tsx";
import { OutcomeError } from "./outcomeError.ts";

export const autoplayQueryKey = ["autoplay"] as const;

function unwrap(outcome: AutoplayOutcome): AutoplayOutcome {
  if (outcome.kind !== "success") throw new OutcomeError(outcome);
  return outcome;
}

export function useAutoplaySetting() {
  const { autoplay } = useCore();
  return useQuery({
    queryKey: autoplayQueryKey,
    queryFn: async () => unwrap(await autoplay.get()),
    select: (outcome) => (outcome.kind === "success" ? outcome.data : true),
  });
}

export function useSetAutoplay() {
  const { autoplay } = useCore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (on: boolean) => unwrap(await autoplay.set(on)),
    onSuccess: (outcome) => {
      queryClient.setQueryData(autoplayQueryKey, outcome);
    },
  });
}

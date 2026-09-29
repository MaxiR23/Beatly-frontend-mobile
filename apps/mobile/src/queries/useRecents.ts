// INFO: the query hook of GET /recents, a single page that never grows; its cache time comes from the outcome's max-age via the QueryClient.
import { useQuery } from "@tanstack/react-query";

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

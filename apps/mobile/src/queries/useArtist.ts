// INFO: the query hook of GET /artist/{id}; its cache time comes from the outcome's max-age via the QueryClient.
import { useQuery } from "@tanstack/react-query";

import { useCore } from "../providers/CoreProvider.tsx";
import { OutcomeError } from "./outcomeError.ts";

export const artistQueryKey = (id: string) => ["artist", id] as const;

export function useArtist(id: string) {
  const { artists } = useCore();
  return useQuery({
    queryKey: artistQueryKey(id),
    queryFn: async () => {
      const outcome = await artists.getArtist(id);
      if (outcome.kind !== "success") throw new OutcomeError(outcome);
      return outcome;
    },
    select: (outcome) => outcome.data,
  });
}

// INFO: the query hook of GET /album/{id}; its cache time comes from the outcome's max-age via the QueryClient.
import { useQuery } from "@tanstack/react-query";

import { useCore } from "../providers/CoreProvider.tsx";
import { OutcomeError } from "./outcomeError.ts";

export const albumQueryKey = (id: string) => ["album", id] as const;

export function useAlbum(id: string) {
  const { album } = useCore();
  return useQuery({
    queryKey: albumQueryKey(id),
    queryFn: async () => {
      const outcome = await album.getAlbum(id);
      if (outcome.kind !== "success") throw new OutcomeError(outcome);
      return outcome;
    },
    select: (outcome) => outcome.data,
  });
}

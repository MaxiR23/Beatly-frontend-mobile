// INFO: the query hook of GET /profile/me; its cache time comes from the outcome's max-age via the QueryClient.
import { useQuery } from "@tanstack/react-query";

import { useCore } from "../providers/CoreProvider.tsx";
import { OutcomeError } from "./outcomeError.ts";

export const profileQueryKey = ["profile", "me"] as const;

export function useProfile() {
  const { profile } = useCore();
  return useQuery({
    queryKey: profileQueryKey,
    queryFn: async () => {
      const outcome = await profile.getMyProfile();
      if (outcome.kind !== "success") throw new OutcomeError(outcome);
      return outcome;
    },
    select: (outcome) => outcome.data,
  });
}

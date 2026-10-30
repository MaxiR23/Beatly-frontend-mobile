// INFO: the query hook of GET /profile/me (it can be disabled, as the route gate does until it is needed), its cache time from the outcome's max-age via the QueryClient, and the mutation of PATCH /profile/me, which refetches it before it settles.
import type { Profile, Success, UpdateProfileInput } from "@beatly/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useCore } from "../providers/CoreProvider.tsx";
import { OutcomeError } from "./outcomeError.ts";

export const profileQueryKey = ["profile", "me"] as const;

export function useProfile(enabled = true) {
  const { profile } = useCore();
  return useQuery({
    queryKey: profileQueryKey,
    enabled,
    queryFn: async () => {
      const outcome = await profile.getMyProfile();
      if (outcome.kind !== "success") throw new OutcomeError(outcome);
      return outcome;
    },
    select: (outcome) => outcome.data,
  });
}

export function useUpdateProfile() {
  const { profile } = useCore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      const outcome = await profile.updateMyProfile(input);
      if (outcome.kind !== "success") throw new OutcomeError(outcome);
      return outcome.data;
    },
    // The saved profile is written first, so a failed refetch cannot leave the old values drawn. Awaited: the sheet closes once every reader of the profile (header avatar, account sheet, profile screen) has the new values.
    onSuccess: (data) => {
      queryClient.setQueryData<Success<Profile>>(profileQueryKey, (previous) =>
        previous ? { ...previous, data } : previous,
      );
      return queryClient.invalidateQueries({ queryKey: profileQueryKey });
    },
  });
}

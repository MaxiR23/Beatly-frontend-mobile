// INFO: the onboarding queries: the curated artists to pick from (GET /onboarding/artists, paged through the shared infinite-query hook, cache time from the pages' max-age), the similar artists of a pick (POST /onboarding/similar, a mutation), the mutation that completes the onboarding and generates the recommendations, the write of the completion into the cached profile, and the device mark that the account finished it (local data: no max-age, so staleTimeFor treats it as stale; the mutation writes the result into the cache instead of refetching).
import type { OnboardingMarkOutcome, Profile, Success } from "@beatly/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useCore } from "../providers/CoreProvider.tsx";
import { OutcomeError } from "./outcomeError.ts";
import { profileQueryKey } from "./useProfile.ts";
import { useInfiniteList } from "./useInfiniteList.ts";

export const onboardingArtistsQueryKey = ["onboarding", "artists"] as const;
export const onboardingMarkQueryKey = ["onboarding", "mark"] as const;

type MarkSuccess = Extract<OnboardingMarkOutcome, { kind: "success" }>;

function unwrap(outcome: OnboardingMarkOutcome): MarkSuccess {
  if (outcome.kind !== "success") throw new OutcomeError(outcome);
  return outcome;
}

export function useOnboardingArtists() {
  const { onboarding } = useCore();
  return useInfiniteList({
    queryKey: onboardingArtistsQueryKey,
    fetchPage: (cursor) => onboarding.listArtists(cursor),
  });
}

// POST /onboarding/similar for one pick; a mutation because the body is what is on screen at that moment and the route sends private, no-cache.
export function useSimilarArtists() {
  const { onboarding } = useCore();
  return useMutation({
    mutationFn: async (input: {
      readonly artistId: string;
      readonly excludeIds: readonly string[];
    }) => {
      const outcome = await onboarding.similar(input.artistId, input.excludeIds);
      if (outcome.kind !== "success") throw new OutcomeError(outcome);
      return outcome.data.artists;
    },
  });
}

export function useFinishOnboarding() {
  const { onboarding } = useCore();
  return useMutation({
    mutationFn: async (artistIds: readonly string[]) => {
      const outcome = await onboarding.finish(artistIds);
      if (outcome.kind !== "success") throw new OutcomeError(outcome);
      return outcome.data;
    },
  });
}

// Writes the completion into the cached profile, so the guard opens home (or the kept link), then refetches it.
export function useMarkOnboarded() {
  const queryClient = useQueryClient();
  return (completedAt: string) => {
    queryClient.setQueryData<Success<Profile>>(profileQueryKey, (previous) =>
      previous
        ? { ...previous, data: { ...previous.data, onboarding_completed_at: completedAt } }
        : previous,
    );
    void queryClient.invalidateQueries({ queryKey: profileQueryKey });
  };
}

export function useOnboardingMark(enabled: boolean) {
  const { onboardingMark } = useCore();
  return useQuery({
    queryKey: onboardingMarkQueryKey,
    enabled,
    queryFn: async () => unwrap(await onboardingMark.isDone()),
    select: (outcome) => outcome.data,
  });
}

// Stores the mark for the signed-in account and writes the result into the cache instead of refetching.
export function useRecordOnboarded() {
  const { onboardingMark } = useCore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => unwrap(await onboardingMark.markDone()),
    onSuccess: (outcome) => {
      queryClient.setQueryData(onboardingMarkQueryKey, outcome);
    },
  });
}

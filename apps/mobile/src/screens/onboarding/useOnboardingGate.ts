// INFO: the route gate: the device mark stored for this account opens home without waiting for the profile; otherwise the profile's onboarding_completed_at (null or a timestamp) picks the onboarding or home; a profile that says done stores the mark.
import type { AuthStatus, Profile } from "@beatly/core";
import { useEffect } from "react";

import { useSession } from "../../providers/SessionProvider.tsx";
import { useOnboardingMark, useRecordOnboarded } from "../../queries/useOnboarding.ts";
import { useProfile } from "../../queries/useProfile.ts";

export type Gate = "deciding" | "signed_out" | "failed" | "onboarding" | "home";

export function gateOf(
  status: "unknown" | AuthStatus,
  mark: { readonly data: boolean | undefined; readonly isError: boolean },
  profile: { readonly data: Profile | undefined; readonly isError: boolean },
): Gate {
  if (status === "unknown") return "deciding";
  if (status === "signed_out") return "signed_out";
  // Once done it is never undone: a mark stored for this account wins over the profile.
  if (mark.data === true) return "home";
  // Still reading the device; an unreadable mark falls back to the profile.
  if (mark.data === undefined && !mark.isError) return "deciding";
  if (profile.data !== undefined) {
    return profile.data.onboarding_completed_at === null ? "onboarding" : "home";
  }
  return profile.isError ? "failed" : "deciding";
}

export function useOnboardingGate() {
  const { status } = useSession();
  const signedIn = status === "signed_in";
  const mark = useOnboardingMark(signedIn);
  const marked = mark.data === true;
  const markRead = mark.data !== undefined || mark.isError;
  const profile = useProfile(signedIn && markRead && !marked);
  const record = useRecordOnboarded();
  const completedAt = profile.data?.onboarding_completed_at ?? null;
  const { mutate } = record;

  // Stores the mark when the profile says done: read at startup, or written by "Empezar".
  useEffect(() => {
    if (signedIn && markRead && !marked && completedAt !== null) mutate();
  }, [signedIn, markRead, marked, completedAt, mutate]);

  return {
    gate: gateOf(status, mark, profile),
    retry: () => void profile.refetch(),
    retrying: profile.isFetching,
  };
}

// INFO: the hooks over the auth port: the stored session's email as a query (local data with no Cache-Control, so the default stale time applies) and the mutations; the sign operations never reject, so their outcome is the mutation's data.
import type { EmailLink, SignInInput, SignUpInput } from "@beatly/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useCore } from "../providers/CoreProvider.tsx";
import { recentSearchesQueryKey } from "./useRecentSearches.ts";

export const emailQueryKey = ["auth", "email"] as const;

export function useEmail() {
  const { auth } = useCore();
  return useQuery({ queryKey: emailQueryKey, queryFn: () => auth.getEmail() });
}

export function useSignIn() {
  const { auth } = useCore();
  return useMutation({ mutationFn: (input: SignInInput) => auth.signIn(input) });
}

export function useSignUp() {
  const { auth } = useCore();
  return useMutation({ mutationFn: (input: SignUpInput) => auth.signUp(input) });
}

export function useSignOut() {
  const { auth, recentSearches } = useCore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      // Order: sign out first. A failed sign-out leaves the user signed in, so their recents stay.
      // Once it succeeds the recents are cleared so the next account on this device starts empty;
      // a failed clear returns a typed outcome (already logged by the service) and never turns a
      // completed sign-out into a failure. The cached list is dropped either way.
      const result = await auth.signOut();
      if (result.kind === "success") {
        await recentSearches.clear();
        queryClient.removeQueries({ queryKey: recentSearchesQueryKey });
      }
      return result;
    },
  });
}

export function useConfirmEmail() {
  const { auth } = useCore();
  return useMutation({ mutationFn: (link: EmailLink) => auth.confirmEmail(link) });
}

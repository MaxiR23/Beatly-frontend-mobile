// INFO: the mutation hooks over the auth port; the port never rejects, so the outcome is the mutation's data.
import type { EmailLink, SignInInput, SignUpInput } from "@beatly/core";
import { useMutation } from "@tanstack/react-query";

import { useCore } from "../providers/CoreProvider.tsx";

export function useSignIn() {
  const { auth } = useCore();
  return useMutation({ mutationFn: (input: SignInInput) => auth.signIn(input) });
}

export function useSignUp() {
  const { auth } = useCore();
  return useMutation({ mutationFn: (input: SignUpInput) => auth.signUp(input) });
}

export function useSignOut() {
  const { auth } = useCore();
  return useMutation({ mutationFn: () => auth.signOut() });
}

export function useConfirmEmail() {
  const { auth } = useCore();
  return useMutation({ mutationFn: (link: EmailLink) => auth.confirmEmail(link) });
}

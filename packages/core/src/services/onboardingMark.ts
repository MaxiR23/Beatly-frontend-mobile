// INFO: the onboarding mark: the device remembers that the signed-in account finished the onboarding, so startup does not wait for the profile; the stored value is the account's user id, so another account on the same phone is not marked; never throws.
import type { AuthPort } from "../ports/auth.ts";
import type { LogPort } from "../ports/log.ts";
import type { StoragePort } from "../ports/storage.ts";
import type { StorageFailure } from "./recentSearches.ts";

export const ONBOARDING_MARK_KEY = "beatly-onboarded";

export type OnboardingMarkOutcome =
  { readonly kind: "success"; readonly data: boolean } | StorageFailure;

export interface OnboardingMarkService {
  // true only when the stored mark belongs to the signed-in account; false when nothing is stored, another account's id is, or there is no account id.
  isDone(): Promise<OnboardingMarkOutcome>;
  // Stores the signed-in account's id; data is false (nothing written) when the session has no id.
  markDone(): Promise<OnboardingMarkOutcome>;
}

export function createOnboardingMarkService(deps: {
  storage: StoragePort;
  auth: AuthPort;
  log: LogPort;
}): OnboardingMarkService {
  const { storage, auth, log } = deps;

  const failure = (cause: StorageFailure["cause"]): StorageFailure => {
    log.warn(`onboarding_mark.${cause}`);
    return { kind: "storage_failure", cause };
  };

  return {
    async isDone() {
      let userId: string | null;
      let stored: string | null;
      try {
        userId = await auth.getUserId();
        stored = await storage.get(ONBOARDING_MARK_KEY);
      } catch {
        return failure("read");
      }
      return { kind: "success", data: userId !== null && stored === userId };
    },
    async markDone() {
      let userId: string | null;
      try {
        userId = await auth.getUserId();
      } catch {
        return failure("read");
      }
      if (userId === null) return { kind: "success", data: false };
      try {
        await storage.set(ONBOARDING_MARK_KEY, userId);
      } catch {
        return failure("write");
      }
      return { kind: "success", data: true };
    },
  };
}

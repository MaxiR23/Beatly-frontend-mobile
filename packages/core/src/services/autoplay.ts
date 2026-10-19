// INFO: the autoplay setting service: whether the end of the queue plays the suggestions, kept on the device over the storage port; on when nothing is stored; never throws.
import type { LogPort } from "../ports/log.ts";
import type { StoragePort } from "../ports/storage.ts";
import type { StorageFailure } from "./recentSearches.ts";

export const AUTOPLAY_KEY = "beatly-autoplay";

export type AutoplayOutcome = { readonly kind: "success"; readonly data: boolean } | StorageFailure;

export interface AutoplayService {
  // On when nothing is stored (a fresh install).
  get(): Promise<AutoplayOutcome>;
  set(on: boolean): Promise<AutoplayOutcome>;
}

export function createAutoplayService(deps: {
  storage: StoragePort;
  log: LogPort;
}): AutoplayService {
  const { storage, log } = deps;

  const failure = (cause: StorageFailure["cause"]): StorageFailure => {
    log.warn(`autoplay.${cause}`);
    return { kind: "storage_failure", cause };
  };

  return {
    async get() {
      let raw: string | null;
      try {
        raw = await storage.get(AUTOPLAY_KEY);
      } catch {
        return failure("read");
      }
      if (raw === null || raw === "on") return { kind: "success", data: true };
      if (raw === "off") return { kind: "success", data: false };
      // A corrupted stored value is replaced by the default, so the feature can recover.
      log.warn("autoplay.schema");
      return { kind: "success", data: true };
    },
    async set(on) {
      try {
        await storage.set(AUTOPLAY_KEY, on ? "on" : "off");
      } catch {
        return failure("write");
      }
      return { kind: "success", data: on };
    },
  };
}

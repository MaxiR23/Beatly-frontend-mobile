// INFO: the sheet nudge service: counts the player openings on the device over the storage port and says whether this one nudges the handle (the first SHEET_NUDGE_LIMIT); never throws.
import type { LogPort } from "../ports/log.ts";
import type { StoragePort } from "../ports/storage.ts";
import type { StorageFailure } from "./recentSearches.ts";

export const SHEET_NUDGE_KEY = "beatly-sheet-nudges";
export const SHEET_NUDGE_LIMIT = 3;

export type SheetNudgeOutcome =
  { readonly kind: "success"; readonly data: boolean } | StorageFailure;

export interface SheetNudgeService {
  // Counts one opening; true while this opening is within the limit.
  take(): Promise<SheetNudgeOutcome>;
}

export function createSheetNudgeService(deps: {
  storage: StoragePort;
  log: LogPort;
}): SheetNudgeService {
  const { storage, log } = deps;

  const failure = (cause: StorageFailure["cause"]): StorageFailure => {
    log.warn(`sheet_nudge.${cause}`);
    return { kind: "storage_failure", cause };
  };

  return {
    async take() {
      let raw: string | null;
      try {
        raw = await storage.get(SHEET_NUDGE_KEY);
      } catch {
        return failure("read");
      }
      let count = 0;
      if (raw !== null) {
        if (/^\d+$/.test(raw)) {
          count = Number(raw);
        } else {
          // A corrupted stored value is replaced by a fresh count, so the feature can recover.
          log.warn("sheet_nudge.schema");
        }
      }
      if (count >= SHEET_NUDGE_LIMIT) return { kind: "success", data: false };
      try {
        await storage.set(SHEET_NUDGE_KEY, String(count + 1));
      } catch {
        return failure("write");
      }
      return { kind: "success", data: true };
    },
  };
}

// packages/core/test/services/sheetNudge.test.ts
//
// Tests for the sheet nudge service.
//
// Tested:
// - take counts one player opening over the storage port and says whether it nudges
//
// What is covered:
// - with data (the first three openings), the limit reached, the read and write failures and a corrupted count
// - Not applicable: ok:false reasons and transport failures, because the service does not call the API
//
// Run with: pnpm --filter @beatly/core test -- sheetNudge
//
// SEE: packages/core/src/services/sheetNudge.ts

import { describe, expect, it } from "vitest";

import {
  SHEET_NUDGE_KEY,
  SHEET_NUDGE_LIMIT,
  createSheetNudgeService,
} from "../../src/services/sheetNudge.ts";
import { createFakeLog } from "../fakes/log.ts";
import { createFakeStorage } from "../fakes/storage.ts";

function setup(initial?: Record<string, string>) {
  const storage = createFakeStorage(initial);
  const log = createFakeLog();
  const service = createSheetNudgeService({ storage: storage.port, log: log.port });
  return { service, storage, log };
}

const ok = (data: boolean) => ({ kind: "success", data });

describe("take", () => {
  it("nudges the first three openings and not the fourth", async () => {
    const { service, storage } = setup();
    expect(SHEET_NUDGE_LIMIT).toBe(3);
    expect(await service.take()).toEqual(ok(true));
    expect(await service.take()).toEqual(ok(true));
    expect(await service.take()).toEqual(ok(true));
    expect(storage.values.get(SHEET_NUDGE_KEY)).toBe("3");
    expect(await service.take()).toEqual(ok(false));
  });

  it("does not write once the limit is reached", async () => {
    const { service, storage } = setup({ [SHEET_NUDGE_KEY]: "3" });
    storage.fail("set");
    expect(await service.take()).toEqual(ok(false));
    expect(storage.values.get(SHEET_NUDGE_KEY)).toBe("3");
  });

  it("fails with a read storage failure when the store cannot be read", async () => {
    const { service, storage, log } = setup();
    storage.fail("get");
    expect(await service.take()).toEqual({ kind: "storage_failure", cause: "read" });
    expect(log.entries.map((e) => e.message)).toEqual(["sheet_nudge.read"]);
  });

  it("fails with a write storage failure when the count cannot be written", async () => {
    const { service, storage, log } = setup();
    storage.fail("set");
    expect(await service.take()).toEqual({ kind: "storage_failure", cause: "write" });
    expect(log.entries.map((e) => e.message)).toEqual(["sheet_nudge.write"]);
  });

  it("recovers from a corrupted count as a first opening", async () => {
    const { service, storage, log } = setup({ [SHEET_NUDGE_KEY]: "abc" });
    expect(await service.take()).toEqual(ok(true));
    expect(storage.values.get(SHEET_NUDGE_KEY)).toBe("1");
    expect(log.entries.map((e) => e.message)).toEqual(["sheet_nudge.schema"]);
  });
});

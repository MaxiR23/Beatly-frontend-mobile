// packages/core/test/services/autoplay.test.ts
//
// Tests for the autoplay setting service.
//
// Tested:
// - get reads the stored setting over the storage port, on by default
// - set stores it
//
// What is covered:
// - with data (off and on as stored, a restart reading the stored value), expected empty (nothing stored reads on)
// - the read and write failures and a corrupted value
// - Not applicable: ok:false reasons and transport failures, because the service does not call the API
//
// Run with: pnpm --filter @beatly/core test -- autoplay
//
// SEE: packages/core/src/services/autoplay.ts

import { describe, expect, it } from "vitest";

import { AUTOPLAY_KEY, createAutoplayService } from "../../src/services/autoplay.ts";
import { createFakeLog } from "../fakes/log.ts";
import { createFakeStorage } from "../fakes/storage.ts";

function setup(initial?: Record<string, string>) {
  const storage = createFakeStorage(initial);
  const log = createFakeLog();
  const service = createAutoplayService({ storage: storage.port, log: log.port });
  return { service, storage, log };
}

const ok = (data: boolean) => ({ kind: "success", data });

describe("get", () => {
  it("reads off and on as stored", async () => {
    expect(await setup({ [AUTOPLAY_KEY]: "off" }).service.get()).toEqual(ok(false));
    expect(await setup({ [AUTOPLAY_KEY]: "on" }).service.get()).toEqual(ok(true));
  });

  it("reads on when nothing is stored", async () => {
    expect(await setup().service.get()).toEqual(ok(true));
  });

  it("reads a corrupted value as on and logs it", async () => {
    const { service, log } = setup({ [AUTOPLAY_KEY]: "maybe" });
    expect(await service.get()).toEqual(ok(true));
    expect(log.entries.map((e) => e.message)).toEqual(["autoplay.schema"]);
  });

  it("fails with a read storage failure when the store cannot be read", async () => {
    const { service, storage, log } = setup();
    storage.fail("get");
    expect(await service.get()).toEqual({ kind: "storage_failure", cause: "read" });
    expect(log.entries.map((e) => e.message)).toEqual(["autoplay.read"]);
  });
});

describe("set", () => {
  it("stores off and a new service over the same storage reads it back", async () => {
    const { service, storage } = setup();
    expect(await service.set(false)).toEqual(ok(false));
    expect(storage.values.get(AUTOPLAY_KEY)).toBe("off");
    const again = createAutoplayService({ storage: storage.port, log: createFakeLog().port });
    expect(await again.get()).toEqual(ok(false));
  });

  it("returns a write failure when the store cannot be written", async () => {
    const { service, storage, log } = setup();
    storage.fail("set");
    expect(await service.set(false)).toEqual({ kind: "storage_failure", cause: "write" });
    expect(log.entries.map((e) => e.message)).toEqual(["autoplay.write"]);
  });
});

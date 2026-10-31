// packages/core/test/services/onboardingMark.test.ts
//
// Tests for the onboarding mark service.
//
// Tested:
// - createOnboardingMarkService().isDone / markDone
//
// What is covered:
// - with data (the stored mark is the signed-in account's id, markDone stores it), expected empty (nothing stored, no account id)
// - the scoping: another account's mark is not this account's, and markDone replaces it
// - the read and write failures, the session that cannot be read
// - Not applicable: ok:false reasons, because the service does not call the API
//
// Run with: pnpm --filter @beatly/core test -- onboardingMark
//
// SEE: packages/core/src/services/onboardingMark.ts

import { describe, expect, it } from "vitest";

import type { AuthPort } from "../../src/ports/auth.ts";
import {
  ONBOARDING_MARK_KEY,
  createOnboardingMarkService,
} from "../../src/services/onboardingMark.ts";
import { createFakeAuth } from "../fakes/auth.ts";
import { createFakeLog } from "../fakes/log.ts";
import { createFakeStorage } from "../fakes/storage.ts";

function setup(options: { initial?: Record<string, string>; auth?: AuthPort } = {}) {
  const storage = createFakeStorage(options.initial);
  const log = createFakeLog();
  const service = createOnboardingMarkService({
    storage: storage.port,
    auth: options.auth ?? createFakeAuth().port,
    log: log.port,
  });
  return { service, storage, log };
}

describe("isDone", () => {
  it("is true when the stored mark is the signed-in account's id", async () => {
    const { service } = setup({ initial: { [ONBOARDING_MARK_KEY]: "user-1" } });
    expect(await service.isDone()).toEqual({ kind: "success", data: true });
  });

  it("is false when nothing is stored", async () => {
    const { service } = setup();
    expect(await service.isDone()).toEqual({ kind: "success", data: false });
  });

  it("is false when the stored mark is another account's id", async () => {
    const { service } = setup({ initial: { [ONBOARDING_MARK_KEY]: "user-2" } });
    expect(await service.isDone()).toEqual({ kind: "success", data: false });
  });

  it("is false when the session has no user id", async () => {
    const { service } = setup({
      initial: { [ONBOARDING_MARK_KEY]: "user-1" },
      auth: createFakeAuth(null).port,
    });
    expect(await service.isDone()).toEqual({ kind: "success", data: false });
  });

  it("fails with a read storage_failure and logs onboarding_mark.read when the store cannot be read", async () => {
    const { service, storage, log } = setup();
    storage.fail("get");
    expect(await service.isDone()).toEqual({ kind: "storage_failure", cause: "read" });
    expect(log.entries.map((entry) => entry.message)).toEqual(["onboarding_mark.read"]);
  });

  it("fails with a read storage_failure when the session cannot be read", async () => {
    const auth: AuthPort = {
      ...createFakeAuth().port,
      getUserId: () => Promise.reject(new Error("store down")),
    };
    const { service } = setup({ auth });
    expect(await service.isDone()).toEqual({ kind: "storage_failure", cause: "read" });
  });
});

describe("markDone", () => {
  it("stores the signed-in account's id under beatly-onboarded", async () => {
    const { service, storage } = setup();
    expect(await service.markDone()).toEqual({ kind: "success", data: true });
    expect(storage.values.get(ONBOARDING_MARK_KEY)).toBe("user-1");
  });

  it("writes nothing and returns false when the session has no user id", async () => {
    const { service, storage } = setup({ auth: createFakeAuth(null).port });
    expect(await service.markDone()).toEqual({ kind: "success", data: false });
    expect(storage.values.size).toBe(0);
  });

  it("replaces another account's mark", async () => {
    const { service, storage } = setup({ initial: { [ONBOARDING_MARK_KEY]: "user-2" } });
    expect(await service.markDone()).toEqual({ kind: "success", data: true });
    expect(storage.values.get(ONBOARDING_MARK_KEY)).toBe("user-1");
  });

  it("fails with a write storage_failure and logs onboarding_mark.write when the store cannot be written", async () => {
    const { service, storage, log } = setup();
    storage.fail("set");
    expect(await service.markDone()).toEqual({ kind: "storage_failure", cause: "write" });
    expect(log.entries.map((entry) => entry.message)).toEqual(["onboarding_mark.write"]);
  });

  it("fails with a read storage_failure when the session cannot be read", async () => {
    const auth: AuthPort = {
      ...createFakeAuth().port,
      getUserId: () => Promise.reject(new Error("store down")),
    };
    const { service } = setup({ auth });
    expect(await service.markDone()).toEqual({ kind: "storage_failure", cause: "read" });
  });
});

// apps/mobile/test/adapters/storage.test.ts
//
// Tests for the storage adapter.
//
// Tested:
// - createStorageAdapter
//
// What is covered:
// - a key never set reads null, a set value reads back, a deleted key reads null
//
// Run with: pnpm --filter @beatly/mobile test -- adapters/storage
//
// SEE: apps/mobile/src/adapters/storage.ts

import { describe, expect, it, jest } from "@jest/globals";

import { createStorageAdapter } from "../../src/adapters/storage.ts";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

describe("createStorageAdapter", () => {
  it("returns null for a key that was never set", async () => {
    expect(await createStorageAdapter().get("never")).toBeNull();
  });

  it("returns what was set", async () => {
    const storage = createStorageAdapter();
    await storage.set("k", "v");
    expect(await storage.get("k")).toBe("v");
  });

  it("returns null after delete", async () => {
    const storage = createStorageAdapter();
    await storage.set("k2", "v");
    await storage.delete("k2");
    expect(await storage.get("k2")).toBeNull();
  });
});

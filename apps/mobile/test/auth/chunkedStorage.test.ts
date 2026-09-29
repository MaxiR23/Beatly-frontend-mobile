// apps/mobile/test/auth/chunkedStorage.test.ts
//
// Tests for the chunked secure storage.
//
// Tested:
// - createChunkedStorage getItem, setItem, removeItem
//
// What is covered:
// - round trip, chunk size, surrogate pairs, stale chunks, removal, missing data
//
// Run with: pnpm --filter @beatly/mobile test -- chunkedStorage
//
// SEE: apps/mobile/src/auth/chunkedStorage.ts

import { describe, expect, it } from "@jest/globals";

import { createChunkedStorage, type SecureKeyValueStore } from "../../src/auth/chunkedStorage.ts";

function mapStore() {
  const map = new Map<string, string>();
  const store: SecureKeyValueStore = {
    getItem: (key) => Promise.resolve(map.get(key) ?? null),
    setItem: (key, value) => {
      map.set(key, value);
      return Promise.resolve();
    },
    removeItem: (key) => {
      map.delete(key);
      return Promise.resolve();
    },
  };
  return { map, storage: createChunkedStorage(store) };
}

describe("createChunkedStorage", () => {
  it("round-trips a value shorter than one chunk", async () => {
    const { storage } = mapStore();
    await storage.setItem("k", "short");
    expect(await storage.getItem("k")).toBe("short");
  });

  it("splits a long value into chunks no store value exceeds", async () => {
    const { map, storage } = mapStore();
    const value = "é".repeat(3000);
    await storage.setItem("k", value);
    expect(await storage.getItem("k")).toBe(value);
    for (const stored of map.values()) {
      expect(new TextEncoder().encode(stored).length).toBeLessThanOrEqual(2048);
    }
    expect(map.get("k.count")).toBe("6");
  });

  it("never cuts a character that spans two UTF-16 units", async () => {
    const { storage } = mapStore();
    const value = `${"a".repeat(499)}😀${"b".repeat(10)}`;
    await storage.setItem("k", value);
    expect(await storage.getItem("k")).toBe(value);
  });

  it("drops stale chunks when a shorter value overwrites a longer one", async () => {
    const { map, storage } = mapStore();
    await storage.setItem("k", "a".repeat(1200));
    await storage.setItem("k", "b");
    expect([...map.keys()].sort()).toEqual(["k.0", "k.count"]);
    expect(await storage.getItem("k")).toBe("b");
  });

  it("removes every chunk and the count", async () => {
    const { map, storage } = mapStore();
    await storage.setItem("k", "a".repeat(1200));
    await storage.removeItem("k");
    expect(map.size).toBe(0);
  });

  it("returns null when nothing is stored", async () => {
    const { storage } = mapStore();
    expect(await storage.getItem("k")).toBeNull();
  });

  it("returns null when a chunk is missing", async () => {
    const { map, storage } = mapStore();
    await storage.setItem("k", "a".repeat(1200));
    map.delete("k.1");
    expect(await storage.getItem("k")).toBeNull();
  });
});

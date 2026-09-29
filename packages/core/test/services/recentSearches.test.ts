// packages/core/test/services/recentSearches.test.ts
//
// Tests for the recent searches service.
//
// Tested:
// - list, add, remove and clear over the storage port
//
// What is covered:
// - with data, expected empty, and the read, write and schema failures
// - Not applicable: ok:false reasons, because the service does not call the API
//
// Run with: pnpm --filter @beatly/core test -- recentSearches
//
// SEE: packages/core/src/services/recentSearches.ts

import { describe, expect, it } from "vitest";

import {
  RECENT_SEARCHES_KEY,
  RECENT_SEARCHES_LIMIT,
  createRecentSearchesService,
} from "../../src/services/recentSearches.ts";
import { createFakeLog } from "../fakes/log.ts";
import { createFakeStorage } from "../fakes/storage.ts";

function setup(initial?: Record<string, string>) {
  const storage = createFakeStorage(initial);
  const log = createFakeLog();
  const service = createRecentSearchesService({ storage: storage.port, log: log.port });
  return { service, storage, log };
}

const ok = (data: readonly string[]) => ({ kind: "success", data });

describe("list", () => {
  it("lists the stored queries newest first", async () => {
    const { service } = setup({ [RECENT_SEARCHES_KEY]: JSON.stringify(["b", "a"]) });
    expect(await service.list()).toEqual(ok(["b", "a"]));
  });

  it("returns an empty list as a success when nothing was ever stored", async () => {
    const { service } = setup();
    expect(await service.list()).toEqual(ok([]));
  });

  it("fails with a read outcome when the store cannot be read", async () => {
    const { service, storage, log } = setup();
    storage.fail("get");
    expect(await service.list()).toEqual({ kind: "storage_failure", cause: "read" });
    expect(log.entries.some((e) => e.level === "warn")).toBe(true);
  });

  it.each(["not json", '{"a":1}'])(
    "fails with a schema outcome and logs when the stored value is %s",
    async (stored) => {
      const { service, log } = setup({ [RECENT_SEARCHES_KEY]: stored });
      expect(await service.list()).toEqual({ kind: "storage_failure", cause: "schema" });
      expect(log.entries.some((e) => e.level === "warn")).toBe(true);
    },
  );
});

describe("add", () => {
  it("adds a query at the top and persists it", async () => {
    const { service, storage } = setup();
    await service.add("a");
    expect(await service.add("b")).toEqual(ok(["b", "a"]));
    const again = createRecentSearchesService({
      storage: storage.port,
      log: createFakeLog().port,
    });
    expect(await again.list()).toEqual(ok(["b", "a"]));
  });

  it("moves a repeated query to the top, compared without case", async () => {
    const { service } = setup({ [RECENT_SEARCHES_KEY]: JSON.stringify(["b", "Daft"]) });
    expect(await service.add("daft")).toEqual(ok(["daft", "b"]));
  });

  it("keeps only the 8 newest queries", async () => {
    const { service } = setup();
    for (let i = 0; i < RECENT_SEARCHES_LIMIT + 2; i += 1) await service.add(`q${String(i)}`);
    const result = await service.list();
    expect(result).toEqual(
      ok(Array.from({ length: RECENT_SEARCHES_LIMIT }, (_, i) => `q${String(9 - i)}`)),
    );
  });

  it("trims a query and ignores an empty one", async () => {
    const { service, storage } = setup();
    expect(await service.add("   ")).toEqual(ok([]));
    expect(storage.values.has(RECENT_SEARCHES_KEY)).toBe(false);
    expect(await service.add("  a  ")).toEqual(ok(["a"]));
  });

  it("starts a fresh list with the query when the stored value is corrupted", async () => {
    const { service, storage } = setup({ [RECENT_SEARCHES_KEY]: "not json" });
    expect(await service.add("a")).toEqual(ok(["a"]));
    expect(storage.values.get(RECENT_SEARCHES_KEY)).toBe(JSON.stringify(["a"]));
  });

  it("fails with a write outcome when the store cannot be written", async () => {
    const { service, storage } = setup();
    storage.fail("set");
    expect(await service.add("a")).toEqual({ kind: "storage_failure", cause: "write" });
  });
});

describe("remove and clear", () => {
  it("removes one query", async () => {
    const { service } = setup({ [RECENT_SEARCHES_KEY]: JSON.stringify(["b", "a"]) });
    expect(await service.remove("a")).toEqual(ok(["b"]));
    expect(await service.list()).toEqual(ok(["b"]));
  });

  it("clears every query", async () => {
    const { service, storage } = setup({ [RECENT_SEARCHES_KEY]: JSON.stringify(["b", "a"]) });
    expect(await service.clear()).toEqual(ok([]));
    expect(storage.values.has(RECENT_SEARCHES_KEY)).toBe(false);
  });

  it("clears a corrupted stored value without reading it", async () => {
    const { service, storage } = setup({ [RECENT_SEARCHES_KEY]: "not json" });
    expect(await service.clear()).toEqual(ok([]));
    expect(storage.values.has(RECENT_SEARCHES_KEY)).toBe(false);
  });

  it("fails with a write outcome when clear cannot write", async () => {
    const { service, storage } = setup();
    storage.fail("delete");
    expect(await service.clear()).toEqual({ kind: "storage_failure", cause: "write" });
  });
});

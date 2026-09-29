// packages/core/test/services/library.test.ts
//
// Tests for the library service.
//
// Tested:
// - listLibrary returns the first page with the liked entry first, in the API's order
// - Returns only the liked entry as a success when the library is empty
// - Surfaces upstream_error as an api failure
// - Fails with a timeout, network or schema outcome
// - Sends the cursor and returns the second page
// - Drops a stale cursor and returns the first page on invalid_cursor
//
// What is covered:
// - Happy path, expected empty state, api failure, transport failure, pagination
//
// Run with: pnpm --filter @beatly/core test -- library
//
// SEE: packages/core/src/services/library.ts

import { afterEach, describe, expect, it, vi } from "vitest";

import { createHttpClient, DEFAULT_TIMEOUT_MS } from "../../src/http/client.ts";
import { createLibraryService } from "../../src/services/library.ts";
import { createFakeAuth } from "../fakes/auth.ts";
import { createFakeHttp, never, type Handler } from "../fakes/http.ts";
import { createFakeLog } from "../fakes/log.ts";

const BASE_URL = "test://api";

const liked = {
  kind: "playlist",
  id: "liked",
  title: "liked",
  thumbnail_url: null,
  subtitle: null,
  source: "liked",
  thumbnail_urls: [],
};
const ownPlaylist = {
  kind: "playlist",
  id: "p1",
  title: "Road trip",
  thumbnail_url: null,
  subtitle: null,
  source: "user",
  thumbnail_urls: ["test://img/1", "test://img/2", "test://img/3", "test://img/4"],
};
const savedAlbum = {
  kind: "album",
  id: "a1",
  title: "Some album",
  thumbnail_url: "test://img/a1",
  subtitle: "Some artist",
  source: "external",
  thumbnail_urls: [],
};

function pageBody(items: unknown[], page: Record<string, unknown>) {
  return { ok: true, data: { items, page } };
}

function setup(handler: Handler) {
  const http = createFakeHttp({ "GET /library": handler }, BASE_URL);
  const client = createHttpClient({
    http: http.port,
    auth: createFakeAuth().port,
    log: createFakeLog().port,
    baseUrl: BASE_URL,
  });
  return { service: createLibraryService(client), http };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("listLibrary", () => {
  it("returns the first page with the liked entry first and the rest in the API's order", async () => {
    const page = { limit: 50, next_cursor: "c1", has_more: true, total: 2 };
    const { service, http } = setup(() => ({
      headers: { "cache-control": "private, no-cache" },
      body: pageBody([liked, ownPlaylist, savedAlbum], page),
    }));
    expect(await service.listLibrary(null)).toEqual({
      kind: "success",
      maxAgeSeconds: 0,
      data: { items: [liked, ownPlaylist, savedAlbum], page, restartedFromFirstPage: false },
    });
    expect(http.requests).toHaveLength(1);
    expect(http.requests[0]?.url).toBe("test://api/library");
  });

  it("returns only the liked entry as a success when the library is empty", async () => {
    const page = { limit: 50, next_cursor: null, has_more: false, total: 0 };
    const { service } = setup(() => ({ body: pageBody([liked], page) }));
    const outcome = await service.listLibrary(null);
    expect(outcome.kind).toBe("success");
    expect(outcome.kind === "success" && outcome.data.items).toEqual([liked]);
    expect(outcome.kind === "success" && outcome.data.page).toEqual(page);
  });

  it("surfaces upstream_error as an api failure", async () => {
    const { service } = setup(() => ({
      status: 502,
      body: { ok: false, reason: "upstream_error" },
    }));
    expect(await service.listLibrary(null)).toEqual({
      kind: "api_failure",
      reason: "upstream_error",
    });
  });

  it("fails with a timeout outcome when the API does not answer", async () => {
    vi.useFakeTimers();
    const { service } = setup(never);
    const pending = service.listLibrary(null);
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS + 1);
    expect(await pending).toEqual({ kind: "transport_failure", cause: "timeout" });
  });

  it("fails with a network outcome when the request cannot be sent", async () => {
    const { service } = setup(() => Promise.reject(new Error("offline")));
    expect(await service.listLibrary(null)).toEqual({
      kind: "transport_failure",
      cause: "network",
    });
  });

  it("fails with a schema outcome when an entry has an unknown kind", async () => {
    const page = { limit: 50, next_cursor: null, has_more: false, total: 1 };
    const { service } = setup(() => ({
      body: pageBody([{ ...ownPlaylist, kind: "artist" }], page),
    }));
    expect(await service.listLibrary(null)).toEqual({
      kind: "transport_failure",
      cause: "schema",
    });
  });

  it("fails with a schema outcome when thumbnail_urls is null", async () => {
    const page = { limit: 50, next_cursor: null, has_more: false, total: 1 };
    const { service } = setup(() => ({
      body: pageBody([{ ...ownPlaylist, thumbnail_urls: null }], page),
    }));
    expect(await service.listLibrary(null)).toEqual({
      kind: "transport_failure",
      cause: "schema",
    });
  });

  it("sends the cursor and returns the second page", async () => {
    const page = { limit: 50, next_cursor: null, has_more: false, total: 2 };
    const { service, http } = setup(() => ({ body: pageBody([savedAlbum], page) }));
    const outcome = await service.listLibrary("c1");
    expect(http.requests[0]?.url).toContain("cursor=c1");
    expect(outcome.kind === "success" && outcome.data.items).toEqual([savedAlbum]);
    expect(outcome.kind === "success" && outcome.data.restartedFromFirstPage).toBe(false);
  });

  it("drops a stale cursor and returns the first page on invalid_cursor", async () => {
    const page = { limit: 50, next_cursor: null, has_more: false, total: 0 };
    const { service, http } = setup((req) =>
      req.query.cursor === undefined
        ? { body: pageBody([liked], page) }
        : { status: 422, body: { ok: false, reason: "invalid_cursor" } },
    );
    const outcome = await service.listLibrary("stale");
    expect(http.requests).toHaveLength(2);
    expect(http.requests[1]?.url).not.toContain("cursor");
    expect(outcome.kind === "success" && outcome.data.items).toEqual([liked]);
    expect(outcome.kind === "success" && outcome.data.restartedFromFirstPage).toBe(true);
  });
});

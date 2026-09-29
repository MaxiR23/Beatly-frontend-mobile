// packages/core/test/services/playlists.test.ts
//
// Tests for the playlists service.
//
// Tested:
// - listPlaylists returns the first page of the caller's playlists
// - Returns an empty first page as a success when the caller has none
// - Surfaces upstream_error as an api failure
// - Fails with a timeout, network or schema outcome
// - Sends the cursor and returns the second page
// - Drops a stale cursor and returns the first page on invalid_cursor
// - createPlaylist posts the title, description and is_public and returns the playlist
// - Omits description when it is not given
// - Surfaces invalid_request as an api failure
// - Fails with a timeout, network or schema outcome
//
// What is covered:
// - Happy path, expected empty state, api failure, transport failure, pagination, creation
//
// Run with: pnpm --filter @beatly/core test -- playlists
//
// SEE: packages/core/src/services/playlists.ts

import { afterEach, describe, expect, it, vi } from "vitest";

import { createHttpClient, DEFAULT_TIMEOUT_MS } from "../../src/http/client.ts";
import { createPlaylistsService } from "../../src/services/playlists.ts";
import { createFakeAuth } from "../fakes/auth.ts";
import { createFakeHttp, never, type Handler } from "../fakes/http.ts";
import { createFakeLog } from "../fakes/log.ts";

const BASE_URL = "test://api";

const withCover = {
  id: "p1",
  owner_id: "u1",
  title: "Road trip",
  description: "Windows down",
  is_public: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
  thumbnail_urls: ["test://img/1", "test://img/2", "test://img/3", "test://img/4"],
};
const withoutCover = {
  ...withCover,
  id: "p2",
  title: "Empty one",
  description: null,
  thumbnail_urls: [],
};

function pageBody(items: unknown[], page: Record<string, unknown>) {
  return { ok: true, data: { items, page } };
}

const created = {
  id: "p9",
  owner_id: "u1",
  title: "New one",
  description: "Fresh",
  is_public: true,
  created_at: "2026-02-01T00:00:00Z",
  updated_at: "2026-02-01T00:00:00Z",
};

function setup(handler: Handler, post: Handler = never) {
  const http = createFakeHttp({ "GET /playlists": handler, "POST /playlists": post }, BASE_URL);
  const client = createHttpClient({
    http: http.port,
    auth: createFakeAuth().port,
    log: createFakeLog().port,
    baseUrl: BASE_URL,
  });
  return { service: createPlaylistsService(client), http };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("listPlaylists", () => {
  it("returns the first page of the caller's playlists", async () => {
    const page = { limit: 50, next_cursor: "c1", has_more: true, total: 2 };
    const { service, http } = setup(() => ({
      headers: { "cache-control": "private, no-cache" },
      body: pageBody([withCover, withoutCover], page),
    }));
    expect(await service.listPlaylists(null)).toEqual({
      kind: "success",
      maxAgeSeconds: 0,
      data: { items: [withCover, withoutCover], page, restartedFromFirstPage: false },
    });
    expect(http.requests).toHaveLength(1);
    expect(http.requests[0]?.url).toBe("test://api/playlists");
  });

  it("returns an empty first page as a success when the caller has none", async () => {
    const page = { limit: 50, next_cursor: null, has_more: false, total: 0 };
    const { service } = setup(() => ({ body: pageBody([], page) }));
    const outcome = await service.listPlaylists(null);
    expect(outcome.kind).toBe("success");
    expect(outcome.kind === "success" && outcome.data.items).toEqual([]);
    expect(outcome.kind === "success" && outcome.data.page).toEqual(page);
  });

  it("surfaces upstream_error as an api failure", async () => {
    const { service } = setup(() => ({
      status: 502,
      body: { ok: false, reason: "upstream_error" },
    }));
    expect(await service.listPlaylists(null)).toEqual({
      kind: "api_failure",
      reason: "upstream_error",
    });
  });

  it("fails with a timeout outcome when the API does not answer", async () => {
    vi.useFakeTimers();
    const { service } = setup(never);
    const pending = service.listPlaylists(null);
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS + 1);
    expect(await pending).toEqual({ kind: "transport_failure", cause: "timeout" });
  });

  it("fails with a network outcome when the request cannot be sent", async () => {
    const { service } = setup(() => Promise.reject(new Error("offline")));
    expect(await service.listPlaylists(null)).toEqual({
      kind: "transport_failure",
      cause: "network",
    });
  });

  it("fails with a schema outcome when thumbnail_urls is null", async () => {
    const page = { limit: 50, next_cursor: null, has_more: false, total: 1 };
    const { service } = setup(() => ({
      body: pageBody([{ ...withCover, thumbnail_urls: null }], page),
    }));
    expect(await service.listPlaylists(null)).toEqual({
      kind: "transport_failure",
      cause: "schema",
    });
  });

  it("sends the cursor and returns the second page", async () => {
    const page = { limit: 50, next_cursor: null, has_more: false, total: 2 };
    const { service, http } = setup(() => ({ body: pageBody([withoutCover], page) }));
    const outcome = await service.listPlaylists("c1");
    expect(http.requests[0]?.url).toContain("cursor=c1");
    expect(outcome.kind === "success" && outcome.data.items).toEqual([withoutCover]);
    expect(outcome.kind === "success" && outcome.data.restartedFromFirstPage).toBe(false);
  });

  it("drops a stale cursor and returns the first page on invalid_cursor", async () => {
    const page = { limit: 50, next_cursor: null, has_more: false, total: 1 };
    const { service, http } = setup((req) =>
      req.query.cursor === undefined
        ? { body: pageBody([withCover], page) }
        : { status: 422, body: { ok: false, reason: "invalid_cursor" } },
    );
    const outcome = await service.listPlaylists("stale");
    expect(http.requests).toHaveLength(2);
    expect(http.requests[1]?.url).not.toContain("cursor");
    expect(outcome.kind === "success" && outcome.data.items).toEqual([withCover]);
    expect(outcome.kind === "success" && outcome.data.restartedFromFirstPage).toBe(true);
  });
});

describe("createPlaylist", () => {
  it("posts the title, description and is_public and returns the created playlist", async () => {
    const { service, http } = setup(never, () => ({
      headers: { "cache-control": "private, no-cache" },
      body: { ok: true, data: created },
    }));
    const outcome = await service.createPlaylist({
      title: "New one",
      description: "Fresh",
      is_public: true,
    });
    expect(outcome).toEqual({ kind: "success", maxAgeSeconds: 0, data: created });
    expect(http.requests[0]?.method).toBe("POST");
    expect(http.requests[0]?.url).toBe("test://api/playlists");
    expect(http.requests[0]?.headers["content-type"]).toBe("application/json");
    expect(JSON.parse(http.requests[0]?.body ?? "")).toEqual({
      title: "New one",
      description: "Fresh",
      is_public: true,
    });
  });

  it("omits description when it is not given", async () => {
    const { service, http } = setup(never, () => ({ body: { ok: true, data: created } }));
    await service.createPlaylist({ title: "New one", is_public: false });
    expect(JSON.parse(http.requests[0]?.body ?? "")).toEqual({
      title: "New one",
      is_public: false,
    });
  });

  it("surfaces invalid_request as an api failure", async () => {
    const { service } = setup(never, () => ({
      status: 422,
      body: { ok: false, reason: "invalid_request" },
    }));
    expect(await service.createPlaylist({ title: "", is_public: false })).toEqual({
      kind: "api_failure",
      reason: "invalid_request",
    });
  });

  it("fails with a timeout outcome when the API does not answer", async () => {
    vi.useFakeTimers();
    const { service } = setup(never, never);
    const pending = service.createPlaylist({ title: "x", is_public: false });
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS + 1);
    expect(await pending).toEqual({ kind: "transport_failure", cause: "timeout" });
  });

  it("fails with a network outcome when the request cannot be sent", async () => {
    const { service } = setup(never, () => Promise.reject(new Error("offline")));
    expect(await service.createPlaylist({ title: "x", is_public: false })).toEqual({
      kind: "transport_failure",
      cause: "network",
    });
  });

  it("fails with a schema outcome when the created playlist has no owner_id", async () => {
    const withoutOwner: Record<string, unknown> = { ...created };
    delete withoutOwner.owner_id;
    const { service } = setup(never, () => ({ body: { ok: true, data: withoutOwner } }));
    expect(await service.createPlaylist({ title: "x", is_public: false })).toEqual({
      kind: "transport_failure",
      cause: "schema",
    });
  });
});

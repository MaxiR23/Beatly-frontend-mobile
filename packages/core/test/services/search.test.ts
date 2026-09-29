// packages/core/test/services/search.test.ts
//
// Tests for the search service.
//
// Tested:
// - search returns the top artist, songs and albums for a query
// - Returns a null artist and empty lists as a success when nothing matches
// - Surfaces upstream_error and upstream_timeout as api failures
// - Fails with a timeout, network or schema outcome
//
// What is covered:
// - Happy path, expected empty state, api failure, transport failure
//
// Run with: pnpm --filter @beatly/core test -- search
//
// SEE: packages/core/src/services/search.ts

import { afterEach, describe, expect, it, vi } from "vitest";

import { createHttpClient, DEFAULT_TIMEOUT_MS } from "../../src/http/client.ts";
import { createSearchService } from "../../src/services/search.ts";
import { createFakeAuth } from "../fakes/auth.ts";
import { createFakeHttp, never, type Handler } from "../fakes/http.ts";
import { createFakeLog } from "../fakes/log.ts";

const BASE_URL = "test://api";
const data = {
  artist: { id: "ar1", name: "Daft Punk" },
  songs: [
    {
      track_id: "t1",
      title: "Get Lucky",
      artists: [{ id: "ar1", name: "Daft Punk" }],
      album: "Random Access Memories",
      album_id: "al1",
      duration_seconds: 248,
      thumbnail_url: "test://img/t1",
    },
  ],
  albums: [
    {
      id: "al1",
      playlist_id: "pl1",
      title: "Random Access Memories",
      artists: [{ id: "ar1", name: "Daft Punk" }],
      year: "2013",
      thumbnail_url: "test://img/al1",
    },
  ],
};

function setup(handler: Handler) {
  const http = createFakeHttp({ "GET /search": handler }, BASE_URL);
  const client = createHttpClient({
    http: http.port,
    auth: createFakeAuth().port,
    log: createFakeLog().port,
    baseUrl: BASE_URL,
  });
  return { service: createSearchService(client), http };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("search", () => {
  it("returns the top artist, songs and albums for a query", async () => {
    const { service, http } = setup(() => ({
      headers: { "cache-control": "max-age=3600" },
      body: { ok: true, data },
    }));
    expect(await service.search("daft punk")).toEqual({
      kind: "success",
      data,
      maxAgeSeconds: 3600,
    });
    expect(http.requests).toHaveLength(1);
    expect(http.requests[0]?.method).toBe("GET");
    expect(http.requests[0]?.url).toBe("test://api/search?q=daft%20punk");
    expect(http.requests[0]?.headers.authorization).toBe("Bearer test-token");
  });

  it("keeps an artist reference without an id and an album without year or cover", async () => {
    const odd = {
      artist: null,
      songs: [{ ...data.songs[0], artists: [{ id: null, name: "Various" }] }],
      albums: [{ ...data.albums[0], artists: [], year: null, thumbnail_url: null }],
    };
    const { service } = setup(() => ({ body: { ok: true, data: odd } }));
    expect(await service.search("x")).toEqual({ kind: "success", data: odd, maxAgeSeconds: 0 });
  });

  it("returns a null artist and empty lists as a success when nothing matches", async () => {
    const empty = { artist: null, songs: [], albums: [] };
    const { service } = setup(() => ({ body: { ok: true, data: empty } }));
    expect(await service.search("zzz")).toEqual({
      kind: "success",
      data: empty,
      maxAgeSeconds: 0,
    });
  });

  it("surfaces upstream_error as an api failure", async () => {
    const { service } = setup(() => ({
      status: 502,
      body: { ok: false, reason: "upstream_error" },
    }));
    expect(await service.search("x")).toEqual({ kind: "api_failure", reason: "upstream_error" });
  });

  it("surfaces upstream_timeout as an api failure", async () => {
    const { service } = setup(() => ({
      status: 504,
      body: { ok: false, reason: "upstream_timeout" },
    }));
    expect(await service.search("x")).toEqual({ kind: "api_failure", reason: "upstream_timeout" });
  });

  it("fails with a timeout outcome when the API does not answer", async () => {
    vi.useFakeTimers();
    const { service } = setup(never);
    const pending = service.search("x");
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS + 1);
    expect(await pending).toEqual({ kind: "transport_failure", cause: "timeout" });
  });

  it("fails with a network outcome when the request cannot be sent", async () => {
    const { service } = setup(() => Promise.reject(new Error("offline")));
    expect(await service.search("x")).toEqual({ kind: "transport_failure", cause: "network" });
  });

  it("fails with a schema outcome when a song breaks the contract", async () => {
    const { service } = setup(() => ({
      body: { ok: true, data: { ...data, songs: [{ ...data.songs[0], duration_seconds: "225" }] } },
    }));
    expect(await service.search("x")).toEqual({ kind: "transport_failure", cause: "schema" });
  });
});

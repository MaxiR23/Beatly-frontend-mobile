// packages/core/test/services/album.test.ts
//
// Tests for the album service.
//
// Tested:
// - getAlbum returns the album with its tracks and referenced albums
// - Keeps an unavailable track with null id and duration, a null year, count and cover, and an artist reference without an id
// - Encodes the album id in the path
// - Returns empty tracks and empty referenced lists as a success when the album has no audio playlist
// - Surfaces invalid_request, upstream_error and upstream_timeout as api failures
// - Fails with a timeout, network or schema outcome
//
// What is covered:
// - Happy path, expected empty state, api failure, transport failure
//
// Run with: pnpm --filter @beatly/core test -- album
//
// SEE: packages/core/src/services/album.ts

import { afterEach, describe, expect, it, vi } from "vitest";

import { createHttpClient, DEFAULT_TIMEOUT_MS } from "../../src/http/client.ts";
import { createAlbumService } from "../../src/services/album.ts";
import { createFakeAuth } from "../fakes/auth.ts";
import { createFakeHttp, never, type Handler } from "../fakes/http.ts";
import { createFakeLog } from "../fakes/log.ts";

const BASE_URL = "test://api";
const ref = {
  id: "MPREb_2",
  title: "Random Access Memories (Deluxe)",
  artists: [{ id: "ar1", name: "Daft Punk" }],
  year: "2013",
  audio_playlist_id: "OLAK5uy_2",
  thumbnail_url: "test://img/al2",
};
const data = {
  id: "MPREb_1",
  title: "Random Access Memories",
  year: "2013",
  artists: [{ id: "ar1", name: "Daft Punk" }],
  track_count: 2,
  duration_seconds: 4440,
  audio_playlist_id: "OLAK5uy_1",
  thumbnail_url: "test://img/al1",
  tracks: [
    {
      track_id: "t1",
      title: "Get Lucky",
      artists: [{ id: "ar1", name: "Daft Punk" }],
      duration_seconds: 248,
      is_available: true,
      track_number: 1,
    },
    {
      track_id: "t2",
      title: "Lose Yourself to Dance",
      artists: [{ id: "ar1", name: "Daft Punk" }],
      duration_seconds: 353,
      is_available: true,
      track_number: 2,
    },
  ],
  other_versions: [ref],
  related_recommendations: [{ ...ref, id: "MPREb_3", title: "Discovery" }],
};

function setup(handler: Handler, route = "GET /album/MPREb_1") {
  const http = createFakeHttp({ [route]: handler }, BASE_URL);
  const client = createHttpClient({
    http: http.port,
    auth: createFakeAuth().port,
    log: createFakeLog().port,
    baseUrl: BASE_URL,
  });
  return { service: createAlbumService(client), http };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("getAlbum", () => {
  it("returns the album with its tracks and referenced albums", async () => {
    const { service, http } = setup(() => ({
      headers: { "cache-control": "max-age=86400" },
      body: { ok: true, data },
    }));
    expect(await service.getAlbum("MPREb_1")).toEqual({
      kind: "success",
      data,
      maxAgeSeconds: 86400,
    });
    expect(http.requests).toHaveLength(1);
    expect(http.requests[0]?.method).toBe("GET");
    expect(http.requests[0]?.url).toBe("test://api/album/MPREb_1");
    expect(http.requests[0]?.headers.authorization).toBe("Bearer test-token");
  });

  it("keeps an unavailable track with null id and duration, a null year, count and cover, and an artist reference without an id", async () => {
    const odd = {
      ...data,
      year: null,
      track_count: null,
      thumbnail_url: null,
      tracks: [
        {
          track_id: null,
          title: "Hidden",
          artists: [{ id: null, name: "Various" }],
          duration_seconds: null,
          is_available: false,
          track_number: 1,
        },
      ],
    };
    const { service } = setup(() => ({ body: { ok: true, data: odd } }));
    expect(await service.getAlbum("MPREb_1")).toEqual({
      kind: "success",
      data: odd,
      maxAgeSeconds: 0,
    });
  });

  it("encodes the album id in the path", async () => {
    const { service, http } = setup(() => ({ body: { ok: true, data } }), "GET /album/a%20b%2Fc");
    await service.getAlbum("a b/c");
    expect(http.requests[0]?.url).toBe("test://api/album/a%20b%2Fc");
  });

  it("returns empty tracks and empty referenced lists as a success when the album has no audio playlist", async () => {
    const empty = {
      ...data,
      audio_playlist_id: null,
      tracks: [],
      other_versions: [],
      related_recommendations: [],
    };
    const { service } = setup(() => ({ body: { ok: true, data: empty } }));
    expect(await service.getAlbum("MPREb_1")).toEqual({
      kind: "success",
      data: empty,
      maxAgeSeconds: 0,
    });
  });

  it("surfaces invalid_request as an api failure", async () => {
    const { service } = setup(() => ({
      status: 422,
      body: { ok: false, reason: "invalid_request" },
    }));
    expect(await service.getAlbum("MPREb_1")).toEqual({
      kind: "api_failure",
      reason: "invalid_request",
    });
  });

  it("surfaces upstream_error as an api failure", async () => {
    const { service } = setup(() => ({
      status: 502,
      body: { ok: false, reason: "upstream_error" },
    }));
    expect(await service.getAlbum("MPREb_1")).toEqual({
      kind: "api_failure",
      reason: "upstream_error",
    });
  });

  it("surfaces upstream_timeout as an api failure", async () => {
    const { service } = setup(() => ({
      status: 504,
      body: { ok: false, reason: "upstream_timeout" },
    }));
    expect(await service.getAlbum("MPREb_1")).toEqual({
      kind: "api_failure",
      reason: "upstream_timeout",
    });
  });

  it("fails with a timeout outcome when the API does not answer", async () => {
    vi.useFakeTimers();
    const { service } = setup(never);
    const pending = service.getAlbum("MPREb_1");
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS + 1);
    expect(await pending).toEqual({ kind: "transport_failure", cause: "timeout" });
  });

  it("fails with a network outcome when the request cannot be sent", async () => {
    const { service } = setup(() => Promise.reject(new Error("offline")));
    expect(await service.getAlbum("MPREb_1")).toEqual({
      kind: "transport_failure",
      cause: "network",
    });
  });

  it("fails with a schema outcome when a track lacks is_available", async () => {
    // JSON drops an undefined value, so the key is missing from the body.
    const broken = { ...data.tracks[0], is_available: undefined };
    const { service } = setup(() => ({
      body: { ok: true, data: { ...data, tracks: [broken] } },
    }));
    expect(await service.getAlbum("MPREb_1")).toEqual({
      kind: "transport_failure",
      cause: "schema",
    });
  });
});

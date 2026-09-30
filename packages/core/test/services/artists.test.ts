// packages/core/test/services/artists.test.ts
//
// Tests for the artists service.
//
// Tested:
// - getArtist returns the artist with its songs, albums, singles and related artists
// - Keeps a song with null track id, album, duration and cover, and a single with null type and year
// - Encodes the artist id in the path
// - Returns empty songs, albums, singles and related as a success
// - Surfaces invalid_request, upstream_error and upstream_timeout as api failures
// - Fails with a timeout, network or schema outcome
//
// What is covered:
// - Happy path, expected empty state, api failure, transport failure
//
// Run with: pnpm --filter @beatly/core test -- artists
//
// SEE: packages/core/src/services/artists.ts

import { afterEach, describe, expect, it, vi } from "vitest";

import { createHttpClient, DEFAULT_TIMEOUT_MS } from "../../src/http/client.ts";
import { createArtistsService } from "../../src/services/artists.ts";
import { createFakeAuth } from "../fakes/auth.ts";
import { createFakeHttp, never, type Handler } from "../fakes/http.ts";
import { createFakeLog } from "../fakes/log.ts";

const BASE_URL = "test://api";
const data = {
  id: "UCar1",
  name: "Daft Punk",
  thumbnail_url: "test://img/ar1",
  songs: [
    {
      track_id: "t1",
      title: "Get Lucky",
      artists: [{ id: "UCar1", name: "Daft Punk" }],
      album: "Random Access Memories",
      album_id: "MPREb_1",
      duration_seconds: 248,
      thumbnail_url: "test://img/t1",
    },
  ],
  albums: [
    {
      id: "MPREb_1",
      title: "Random Access Memories",
      artists: [{ id: "UCar1", name: "Daft Punk" }],
      year: "2013",
      audio_playlist_id: "OLAK5uy_1",
      thumbnail_url: "test://img/al1",
    },
  ],
  singles: [
    { id: "MPREb_4", title: "Lose Yourself", year: "2014", type: "Single", thumbnail_url: null },
    { id: "MPREb_5", title: "Alive", year: "2007", type: "EP", thumbnail_url: "test://img/s5" },
  ],
  related: [{ id: "UCar2", name: "Justice", thumbnail_url: "test://img/ar2" }],
};

function setup(handler: Handler, route = "GET /artist/UCar1") {
  const http = createFakeHttp({ [route]: handler }, BASE_URL);
  const client = createHttpClient({
    http: http.port,
    auth: createFakeAuth().port,
    log: createFakeLog().port,
    baseUrl: BASE_URL,
  });
  return { service: createArtistsService(client), http };
}

afterEach(() => {
  vi.useRealTimers();
});

const failure = (status: number, reason: string) => () => ({
  status,
  body: { ok: false, reason },
});

describe("getArtist", () => {
  it("returns the artist with its songs, albums, singles and related artists", async () => {
    const { service, http } = setup(() => ({
      headers: { "cache-control": "max-age=43200" },
      body: { ok: true, data },
    }));
    expect(await service.getArtist("UCar1")).toEqual({
      kind: "success",
      data,
      maxAgeSeconds: 43200,
    });
    expect(http.requests).toHaveLength(1);
    expect(http.requests[0]?.method).toBe("GET");
    expect(http.requests[0]?.url).toBe("test://api/artist/UCar1");
    expect(http.requests[0]?.headers.authorization).toBe("Bearer test-token");
  });

  it("keeps a song with null track_id, album, album_id, duration and cover, and a single with null type and year", async () => {
    const odd = {
      ...data,
      thumbnail_url: null,
      songs: [
        {
          track_id: null,
          title: "Hidden",
          artists: [],
          album: null,
          album_id: null,
          duration_seconds: null,
          thumbnail_url: null,
        },
      ],
      singles: [{ id: "MPREb_4", title: "Odd", year: null, type: null, thumbnail_url: null }],
    };
    const { service } = setup(() => ({ body: { ok: true, data: odd } }));
    expect(await service.getArtist("UCar1")).toEqual({
      kind: "success",
      data: odd,
      maxAgeSeconds: 0,
    });
  });

  it("encodes the artist id in the path", async () => {
    const { service, http } = setup(() => ({ body: { ok: true, data } }), "GET /artist/a%20b%2Fc");
    await service.getArtist("a b/c");
    expect(http.requests[0]?.url).toBe("test://api/artist/a%20b%2Fc");
  });

  it("returns empty songs, albums, singles and related as a success", async () => {
    const empty = { ...data, songs: [], albums: [], singles: [], related: [] };
    const { service } = setup(() => ({ body: { ok: true, data: empty } }));
    expect(await service.getArtist("UCar1")).toEqual({
      kind: "success",
      data: empty,
      maxAgeSeconds: 0,
    });
  });

  it("surfaces invalid_request as an api failure", async () => {
    const { service } = setup(failure(422, "invalid_request"));
    expect(await service.getArtist("UCar1")).toEqual({
      kind: "api_failure",
      reason: "invalid_request",
    });
  });

  it("surfaces upstream_error as an api failure", async () => {
    const { service } = setup(failure(502, "upstream_error"));
    expect(await service.getArtist("UCar1")).toEqual({
      kind: "api_failure",
      reason: "upstream_error",
    });
  });

  it("surfaces upstream_timeout as an api failure", async () => {
    const { service } = setup(failure(504, "upstream_timeout"));
    expect(await service.getArtist("UCar1")).toEqual({
      kind: "api_failure",
      reason: "upstream_timeout",
    });
  });

  it("fails with a timeout outcome when the API does not answer", async () => {
    vi.useFakeTimers();
    const { service } = setup(never);
    const pending = service.getArtist("UCar1");
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS + 1);
    expect(await pending).toEqual({ kind: "transport_failure", cause: "timeout" });
  });

  it("fails with a network outcome when the request cannot be sent", async () => {
    const { service } = setup(() => Promise.reject(new Error("offline")));
    expect(await service.getArtist("UCar1")).toEqual({
      kind: "transport_failure",
      cause: "network",
    });
  });

  it("fails with a schema outcome when a single has an unknown type", async () => {
    const broken = { ...data.singles[0], type: "Album" };
    const { service } = setup(() => ({
      body: { ok: true, data: { ...data, singles: [broken] } },
    }));
    expect(await service.getArtist("UCar1")).toEqual({
      kind: "transport_failure",
      cause: "schema",
    });
  });
});

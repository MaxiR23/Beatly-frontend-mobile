// packages/core/test/services/tracks.test.ts
//
// Tests for the tracks service.
//
// Tested:
// - getUpNext returns the tracks with the requested one first
// - getLyrics returns synced or plain lyrics, or null
// - getRelated returns the songs, artists and albums
// - Encodes the track id in the path
// - Returns an empty tracks list, lyrics null and three empty lists as a success
// - Surfaces track_not_found, upstream_error and upstream_timeout as api failures
// - Fails with a timeout, network or schema outcome
//
// What is covered:
// - Happy path, expected empty state, api failure, transport failure
// - Not applicable: cursor and invalid_cursor, because the three routes are not paginated
//
// Run with: pnpm --filter @beatly/core test -- tracks
//
// SEE: packages/core/src/services/tracks.ts

import { afterEach, describe, expect, it, vi } from "vitest";

import { createHttpClient, DEFAULT_TIMEOUT_MS } from "../../src/http/client.ts";
import { createTracksService } from "../../src/services/tracks.ts";
import { createFakeAuth } from "../fakes/auth.ts";
import { createFakeHttp, never, type Handler } from "../fakes/http.ts";
import { createFakeLog } from "../fakes/log.ts";

const BASE_URL = "test://api";
const ref = (id: string) => ({
  track_id: id,
  title: `Song ${id}`,
  artists: [{ id: "UCar1", name: "Daft Punk" }],
  album: "Random Access Memories",
  album_id: "MPREb_1",
  duration_seconds: 248,
  thumbnail_url: `test://img/${id}`,
});
const upNext = { tracks: [ref("t1"), ref("t2")] };
const synced = {
  lyrics: {
    has_timestamps: true,
    source: "lrclib",
    lines: [
      { text: "one", start_ms: 0, end_ms: 9000 },
      { text: "two", start_ms: 10000, end_ms: null },
    ],
  },
};
const plain = {
  lyrics: {
    has_timestamps: false,
    source: null,
    lines: [{ text: "one", start_ms: null, end_ms: null }],
  },
};
const related = {
  songs: [ref("t3")],
  artists: [{ id: "UCar2", name: "Justice", thumbnail_url: null }],
  albums: [
    {
      id: "MPREb_2",
      title: "Cross",
      artists: [{ id: "UCar2", name: "Justice" }],
      year: "2007",
      audio_playlist_id: "OLAK5uy_2",
      thumbnail_url: "test://img/al2",
    },
  ],
};

function setup(handler: Handler, route: string) {
  const http = createFakeHttp({ [route]: handler }, BASE_URL);
  const client = createHttpClient({
    http: http.port,
    auth: createFakeAuth().port,
    log: createFakeLog().port,
    baseUrl: BASE_URL,
  });
  return { service: createTracksService(client), http };
}

afterEach(() => {
  vi.useRealTimers();
});

const failure = (status: number, reason: string) => () => ({
  status,
  body: { ok: false, reason },
});

const routes = {
  upNext: "GET /tracks/t1/upnext",
  lyrics: "GET /tracks/t1/lyrics",
  related: "GET /tracks/t1/related",
} as const;

describe("getUpNext", () => {
  const route = routes.upNext;

  it("returns the tracks with the requested one first and the max-age", async () => {
    const { service, http } = setup(
      () => ({ headers: { "cache-control": "max-age=21600" }, body: { ok: true, data: upNext } }),
      route,
    );
    expect(await service.getUpNext("t1")).toEqual({
      kind: "success",
      data: upNext,
      maxAgeSeconds: 21600,
    });
    expect(http.requests[0]?.method).toBe("GET");
    expect(http.requests[0]?.url).toBe("test://api/tracks/t1/upnext");
    expect(http.requests[0]?.headers.authorization).toBe("Bearer test-token");
  });

  it("keeps a track with null album, album_id, duration and cover", async () => {
    const odd = {
      tracks: [
        { ...ref("t1"), album: null, album_id: null, duration_seconds: null, thumbnail_url: null },
      ],
    };
    const { service } = setup(() => ({ body: { ok: true, data: odd } }), route);
    expect(await service.getUpNext("t1")).toEqual({
      kind: "success",
      data: odd,
      maxAgeSeconds: 0,
    });
  });

  it("encodes the track id in the path", async () => {
    const { service, http } = setup(
      () => ({ body: { ok: true, data: upNext } }),
      "GET /tracks/a%20b%2Fc/upnext",
    );
    await service.getUpNext("a b/c");
    expect(http.requests[0]?.url).toBe("test://api/tracks/a%20b%2Fc/upnext");
  });

  it("returns an empty tracks list as a success", async () => {
    const { service } = setup(() => ({ body: { ok: true, data: { tracks: [] } } }), route);
    expect(await service.getUpNext("t1")).toEqual({
      kind: "success",
      data: { tracks: [] },
      maxAgeSeconds: 0,
    });
  });

  it.each([
    [404, "track_not_found"],
    [502, "upstream_error"],
    [504, "upstream_timeout"],
  ])("surfaces %i %s as an api failure", async (status, reason) => {
    const { service } = setup(failure(status, reason), route);
    expect(await service.getUpNext("t1")).toEqual({ kind: "api_failure", reason });
  });

  it("fails with a timeout outcome when the API does not answer", async () => {
    vi.useFakeTimers();
    const { service } = setup(never, route);
    const pending = service.getUpNext("t1");
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS + 1);
    expect(await pending).toEqual({ kind: "transport_failure", cause: "timeout" });
  });

  it("fails with a network outcome when the request cannot be sent", async () => {
    const { service } = setup(() => Promise.reject(new Error("offline")), route);
    expect(await service.getUpNext("t1")).toEqual({ kind: "transport_failure", cause: "network" });
  });

  it("fails with a schema outcome when a track has no track_id", async () => {
    const broken = { ...ref("t1"), track_id: undefined };
    const { service } = setup(() => ({ body: { ok: true, data: { tracks: [broken] } } }), route);
    expect(await service.getUpNext("t1")).toEqual({ kind: "transport_failure", cause: "schema" });
  });
});

describe("getLyrics", () => {
  const route = routes.lyrics;

  it("returns synced lyrics with their times", async () => {
    const { service, http } = setup(
      () => ({ headers: { "cache-control": "max-age=86400" }, body: { ok: true, data: synced } }),
      route,
    );
    expect(await service.getLyrics("t1")).toEqual({
      kind: "success",
      data: synced,
      maxAgeSeconds: 86400,
    });
    expect(http.requests[0]?.url).toBe("test://api/tracks/t1/lyrics");
  });

  it("returns plain lyrics with null times on every line", async () => {
    const { service } = setup(() => ({ body: { ok: true, data: plain } }), route);
    expect(await service.getLyrics("t1")).toEqual({
      kind: "success",
      data: plain,
      maxAgeSeconds: 0,
    });
  });

  it("returns lyrics null as a success", async () => {
    const { service } = setup(() => ({ body: { ok: true, data: { lyrics: null } } }), route);
    expect(await service.getLyrics("t1")).toEqual({
      kind: "success",
      data: { lyrics: null },
      maxAgeSeconds: 0,
    });
  });

  it.each([
    [404, "track_not_found"],
    [502, "upstream_error"],
    [504, "upstream_timeout"],
  ])("surfaces %i %s as an api failure", async (status, reason) => {
    const { service } = setup(failure(status, reason), route);
    expect(await service.getLyrics("t1")).toEqual({ kind: "api_failure", reason });
  });

  it("fails with a timeout outcome when the API does not answer", async () => {
    vi.useFakeTimers();
    const { service } = setup(never, route);
    const pending = service.getLyrics("t1");
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS + 1);
    expect(await pending).toEqual({ kind: "transport_failure", cause: "timeout" });
  });

  it("fails with a network outcome when the request cannot be sent", async () => {
    const { service } = setup(() => Promise.reject(new Error("offline")), route);
    expect(await service.getLyrics("t1")).toEqual({ kind: "transport_failure", cause: "network" });
  });

  it("fails with a schema outcome when a line's start_ms is not a number", async () => {
    const broken = {
      lyrics: { ...synced.lyrics, lines: [{ text: "one", start_ms: "0", end_ms: null }] },
    };
    const { service } = setup(() => ({ body: { ok: true, data: broken } }), route);
    expect(await service.getLyrics("t1")).toEqual({ kind: "transport_failure", cause: "schema" });
  });
});

describe("getRelated", () => {
  const route = routes.related;

  it("returns the songs, artists and albums", async () => {
    const { service, http } = setup(
      () => ({ headers: { "cache-control": "max-age=43200" }, body: { ok: true, data: related } }),
      route,
    );
    expect(await service.getRelated("t1")).toEqual({
      kind: "success",
      data: related,
      maxAgeSeconds: 43200,
    });
    expect(http.requests[0]?.url).toBe("test://api/tracks/t1/related");
  });

  it("returns three empty lists as a success", async () => {
    const empty = { songs: [], artists: [], albums: [] };
    const { service } = setup(() => ({ body: { ok: true, data: empty } }), route);
    expect(await service.getRelated("t1")).toEqual({
      kind: "success",
      data: empty,
      maxAgeSeconds: 0,
    });
  });

  it("returns empty songs with artists and albums", async () => {
    const partial = { ...related, songs: [] };
    const { service } = setup(() => ({ body: { ok: true, data: partial } }), route);
    expect(await service.getRelated("t1")).toEqual({
      kind: "success",
      data: partial,
      maxAgeSeconds: 0,
    });
  });

  it.each([
    [404, "track_not_found"],
    [502, "upstream_error"],
    [504, "upstream_timeout"],
  ])("surfaces %i %s as an api failure", async (status, reason) => {
    const { service } = setup(failure(status, reason), route);
    expect(await service.getRelated("t1")).toEqual({ kind: "api_failure", reason });
  });

  it("fails with a timeout outcome when the API does not answer", async () => {
    vi.useFakeTimers();
    const { service } = setup(never, route);
    const pending = service.getRelated("t1");
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS + 1);
    expect(await pending).toEqual({ kind: "transport_failure", cause: "timeout" });
  });

  it("fails with a network outcome when the request cannot be sent", async () => {
    const { service } = setup(() => Promise.reject(new Error("offline")), route);
    expect(await service.getRelated("t1")).toEqual({
      kind: "transport_failure",
      cause: "network",
    });
  });

  it("fails with a schema outcome when an artist has no id", async () => {
    const broken = { ...related, artists: [{ name: "Justice", thumbnail_url: null }] };
    const { service } = setup(() => ({ body: { ok: true, data: broken } }), route);
    expect(await service.getRelated("t1")).toEqual({ kind: "transport_failure", cause: "schema" });
  });
});

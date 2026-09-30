// packages/core/test/services/public.test.ts
//
// Tests for the public service.
//
// Tested:
// - getGenrePlaylist returns a genre playlist with its cover, mosaic and tracks
// - Returns a genre playlist with no tracks, zero duration and no mosaic as a success
// - Surfaces playlist_not_found as an api failure
// - Fails with a timeout, network or schema outcome, also when a track has a null title
// - Encodes the playlist id in the path
//
// What is covered:
// - Happy path, expected empty state, api failure, transport failure
//
// Run with: pnpm --filter @beatly/core test -- public
//
// SEE: packages/core/src/services/public.ts

import { afterEach, describe, expect, it, vi } from "vitest";

import { createHttpClient, DEFAULT_TIMEOUT_MS } from "../../src/http/client.ts";
import { createPublicService } from "../../src/services/public.ts";
import { createFakeAuth } from "../fakes/auth.ts";
import { createFakeHttp, never, type Handler } from "../fakes/http.ts";
import { createFakeLog } from "../fakes/log.ts";

const BASE_URL = "test://api";

function setup(handler: Handler, route = "GET /public/genre-playlists/gp1") {
  const http = createFakeHttp({ [route]: handler }, BASE_URL);
  const client = createHttpClient({
    http: http.port,
    auth: createFakeAuth().port,
    log: createFakeLog().port,
    baseUrl: BASE_URL,
  });
  return { service: createPublicService(client), http };
}

afterEach(() => {
  vi.useRealTimers();
});

const track = {
  track_id: "t1",
  title: "First Song",
  artists: [{ id: "ar1", name: "Daft Punk" }],
  album: "Discovery",
  album_id: "al1",
  duration_seconds: 248,
  thumbnail_url: "test://img/t1",
  position: 1,
};

const header = {
  id: "gp1",
  title: "Pop hits",
  description: "The hits",
  track_count: 12,
  total_duration_seconds: 2400,
  thumbnails: ["test://img/1", "test://img/2", "test://img/3", "test://img/4"],
  thumbnail_url: "test://img/cover",
  tracks: [track],
};

describe("getGenrePlaylist", () => {
  it("returns a genre playlist with its cover, mosaic and tracks", async () => {
    const { service, http } = setup(() => ({
      headers: { "cache-control": "no-store" },
      body: { ok: true, data: { ...header, owner: "Beatly", has_more: false } },
    }));
    expect(await service.getGenrePlaylist("gp1")).toEqual({
      kind: "success",
      maxAgeSeconds: 0,
      data: header,
    });
    expect(http.requests[0]?.url).toBe("test://api/public/genre-playlists/gp1");
    const outcome = await service.getGenrePlaylist("gp1");
    expect(outcome.kind === "success" && outcome.data.tracks).toEqual([track]);
  });

  it("returns a genre playlist with no tracks, zero duration and no mosaic as a success", async () => {
    const empty = {
      ...header,
      description: null,
      track_count: 0,
      total_duration_seconds: 0,
      thumbnails: [],
      thumbnail_url: null,
      tracks: [],
    };
    const { service } = setup(() => ({ body: { ok: true, data: empty } }));
    expect(await service.getGenrePlaylist("gp1")).toEqual({
      kind: "success",
      maxAgeSeconds: 0,
      data: empty,
    });
  });

  it("surfaces playlist_not_found as an api failure", async () => {
    const { service } = setup(() => ({
      status: 404,
      body: { ok: false, reason: "playlist_not_found" },
    }));
    expect(await service.getGenrePlaylist("gp1")).toEqual({
      kind: "api_failure",
      reason: "playlist_not_found",
    });
  });

  it("fails with a timeout outcome when the API does not answer", async () => {
    vi.useFakeTimers();
    const { service } = setup(never);
    const pending = service.getGenrePlaylist("gp1");
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS + 1);
    expect(await pending).toEqual({ kind: "transport_failure", cause: "timeout" });
  });

  it("fails with a network outcome when the request cannot be sent", async () => {
    const { service } = setup(() => Promise.reject(new Error("offline")));
    expect(await service.getGenrePlaylist("gp1")).toEqual({
      kind: "transport_failure",
      cause: "network",
    });
  });

  it("fails with a schema outcome when thumbnails is null", async () => {
    const { service } = setup(() => ({
      body: { ok: true, data: { ...header, thumbnails: null } },
    }));
    expect(await service.getGenrePlaylist("gp1")).toEqual({
      kind: "transport_failure",
      cause: "schema",
    });
  });

  it("fails with a schema outcome when a track has a null title", async () => {
    const { service } = setup(() => ({
      body: { ok: true, data: { ...header, tracks: [{ ...track, title: null }] } },
    }));
    expect(await service.getGenrePlaylist("gp1")).toEqual({
      kind: "transport_failure",
      cause: "schema",
    });
  });

  it("encodes the playlist id in the path", async () => {
    const { service, http } = setup(
      () => ({ body: { ok: true, data: header } }),
      "GET /public/genre-playlists/a%2Fb",
    );
    await service.getGenrePlaylist("a/b");
    expect(http.requests[0]?.url).toBe("test://api/public/genre-playlists/a%2Fb");
  });
});

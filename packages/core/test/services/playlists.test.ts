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
// - getPlaylist returns a playlist with its mosaic, total count and duration
// - getLikedPlaylist returns the liked playlist without a mosaic
// - getPlaylist returns an empty playlist with zero count and duration as a success
// - getPlaylist surfaces playlist_not_found, times out, fails on network and on schema, and encodes the id
// - listPlaylistTracks returns the first page of a playlist's tracks and an empty first page as a success
// - listPlaylistTracks surfaces playlist_not_found, fails with a timeout, network or schema outcome
// - listPlaylistTracks sends the cursor and drops a stale cursor on invalid_cursor
// - getLikedPlaylist returns the liked playlist, also with zero count and duration
// - getLikedPlaylist fails with a timeout, network or schema outcome
// - listLikedTracks returns the first page and an empty first page as a success
// - listLikedTracks fails with a timeout, network or schema outcome
// - listLikedTracks sends the cursor and drops a stale cursor on invalid_cursor
// - listPlaylistsWithTrack returns the ids of the playlists that hold a track, or [] when none
// - addTrackToPlaylist posts the whole body, counts track_already_in_playlist as added and surfaces other reasons
// - createPlaylistWithTrack creates then adds, and stops after a failed create
// - removeTrackFromPlaylist deletes the track, also when it was not there
// - addTrackInputOf maps a playable track and returns null when it lacks a field
//
// What is covered:
// - Happy path, expected empty state, api failure, transport failure, pagination, creation, detail, tracks, membership, add and remove
//
// Run with: pnpm --filter @beatly/core test -- playlists
//
// SEE: packages/core/src/services/playlists.ts

import { afterEach, describe, expect, it, vi } from "vitest";

import { createHttpClient, DEFAULT_TIMEOUT_MS } from "../../src/http/client.ts";
import {
  addTrackInputOf,
  createPlaylistsService,
  type AddTrackInput,
} from "../../src/services/playlists.ts";
import type { PlayableTrack } from "../../src/services/playback.ts";
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

function setupDetail(route: string, handler: Handler) {
  const http = createFakeHttp({ [`GET ${route}`]: handler }, BASE_URL);
  const client = createHttpClient({
    http: http.port,
    auth: createFakeAuth().port,
    log: createFakeLog().port,
    baseUrl: BASE_URL,
  });
  return { service: createPlaylistsService(client), http };
}

const detail: Record<string, unknown> = {
  ...withCover,
  total_count: 2,
  total_duration_seconds: 4440,
};
const likedDetail = {
  owner_id: withCover.owner_id,
  is_public: withCover.is_public,
  created_at: withCover.created_at,
  updated_at: withCover.updated_at,
  id: "liked",
  title: "liked",
  description: null,
  total_count: 0,
  total_duration_seconds: 0,
};
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
const notFound = () => ({ status: 404, body: { ok: false, reason: "playlist_not_found" } });

describe("getPlaylist", () => {
  const route = "/playlists/p1";

  it("returns a playlist with its total count and duration", async () => {
    const { service, http } = setupDetail(route, () => ({
      headers: { "cache-control": "private, no-cache" },
      body: { ok: true, data: detail },
    }));
    expect(await service.getPlaylist("p1")).toEqual({
      kind: "success",
      maxAgeSeconds: 0,
      data: detail,
    });
    expect(http.requests[0]?.url).toBe("test://api/playlists/p1");
  });

  it("returns an empty playlist with zero count and duration as a success", async () => {
    const empty = { ...detail, thumbnail_urls: [], total_count: 0, total_duration_seconds: 0 };
    const { service } = setupDetail(route, () => ({ body: { ok: true, data: empty } }));
    const outcome = await service.getPlaylist("p1");
    expect(outcome.kind === "success" && outcome.data.thumbnail_urls).toEqual([]);
    expect(outcome.kind === "success" && outcome.data.total_count).toBe(0);
    expect(outcome.kind === "success" && outcome.data.total_duration_seconds).toBe(0);
  });

  it("surfaces playlist_not_found as an api failure", async () => {
    const { service } = setupDetail(route, notFound);
    expect(await service.getPlaylist("p1")).toEqual({
      kind: "api_failure",
      reason: "playlist_not_found",
    });
  });

  it("fails with a timeout outcome when the API does not answer", async () => {
    vi.useFakeTimers();
    const { service } = setupDetail(route, never);
    const pending = service.getPlaylist("p1");
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS + 1);
    expect(await pending).toEqual({ kind: "transport_failure", cause: "timeout" });
  });

  it("fails with a network outcome when the request cannot be sent", async () => {
    const { service } = setupDetail(route, () => Promise.reject(new Error("offline")));
    expect(await service.getPlaylist("p1")).toEqual({
      kind: "transport_failure",
      cause: "network",
    });
  });

  it("fails with a schema outcome when total_count is missing", async () => {
    const broken = { ...detail };
    delete broken.total_count;
    const { service } = setupDetail(route, () => ({ body: { ok: true, data: broken } }));
    expect(await service.getPlaylist("p1")).toEqual({
      kind: "transport_failure",
      cause: "schema",
    });
  });

  it("fails with a schema outcome when thumbnail_urls is missing", async () => {
    const broken = { ...detail };
    delete broken.thumbnail_urls;
    const { service } = setupDetail(route, () => ({ body: { ok: true, data: broken } }));
    expect(await service.getPlaylist("p1")).toEqual({
      kind: "transport_failure",
      cause: "schema",
    });
  });

  it("encodes the playlist id in the path", async () => {
    const { service, http } = setupDetail("/playlists/a%2Fb", () => ({
      body: { ok: true, data: detail },
    }));
    await service.getPlaylist("a/b");
    expect(http.requests[0]?.url).toBe("test://api/playlists/a%2Fb");
  });
});

describe("listPlaylistTracks", () => {
  const route = "/playlists/p1/tracks";

  it("returns the first page of a playlist's tracks", async () => {
    const page = { limit: 50, next_cursor: "c1", has_more: true, total: 2 };
    const { service, http } = setupDetail(route, () => ({
      body: pageBody([track], page),
    }));
    expect(await service.listPlaylistTracks("p1", null)).toEqual({
      kind: "success",
      maxAgeSeconds: 0,
      data: { items: [track], page, restartedFromFirstPage: false },
    });
    expect(http.requests[0]?.url).toBe("test://api/playlists/p1/tracks");
  });

  it("returns an empty first page as a success when the playlist has no tracks", async () => {
    const page = { limit: 50, next_cursor: null, has_more: false, total: 0 };
    const { service } = setupDetail(route, () => ({ body: pageBody([], page) }));
    const outcome = await service.listPlaylistTracks("p1", null);
    expect(outcome.kind === "success" && outcome.data.items).toEqual([]);
    expect(outcome.kind === "success" && outcome.data.page).toEqual(page);
  });

  it("surfaces playlist_not_found as an api failure", async () => {
    const { service } = setupDetail(route, notFound);
    expect(await service.listPlaylistTracks("p1", null)).toEqual({
      kind: "api_failure",
      reason: "playlist_not_found",
    });
  });

  it("fails with a timeout outcome when the API does not answer", async () => {
    vi.useFakeTimers();
    const { service } = setupDetail(route, never);
    const pending = service.listPlaylistTracks("p1", null);
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS + 1);
    expect(await pending).toEqual({ kind: "transport_failure", cause: "timeout" });
  });

  it("fails with a network outcome when the request cannot be sent", async () => {
    const { service } = setupDetail(route, () => Promise.reject(new Error("offline")));
    expect(await service.listPlaylistTracks("p1", null)).toEqual({
      kind: "transport_failure",
      cause: "network",
    });
  });

  it("fails with a schema outcome when a track has a null thumbnail_url", async () => {
    const page = { limit: 50, next_cursor: null, has_more: false, total: 1 };
    const { service } = setupDetail(route, () => ({
      body: pageBody([{ ...track, thumbnail_url: null }], page),
    }));
    expect(await service.listPlaylistTracks("p1", null)).toEqual({
      kind: "transport_failure",
      cause: "schema",
    });
  });

  it("sends the cursor and returns the second page", async () => {
    const page = { limit: 50, next_cursor: null, has_more: false, total: 2 };
    const second = { ...track, track_id: "t2", position: 2 };
    const { service, http } = setupDetail(route, () => ({ body: pageBody([second], page) }));
    const outcome = await service.listPlaylistTracks("p1", "c1");
    expect(http.requests[0]?.url).toContain("cursor=c1");
    expect(outcome.kind === "success" && outcome.data.items).toEqual([second]);
  });

  it("drops a stale cursor and returns the first page on invalid_cursor", async () => {
    const page = { limit: 50, next_cursor: null, has_more: false, total: 1 };
    const { service, http } = setupDetail(route, (req) =>
      req.query.cursor === undefined
        ? { body: pageBody([track], page) }
        : { status: 422, body: { ok: false, reason: "invalid_cursor" } },
    );
    const outcome = await service.listPlaylistTracks("p1", "stale");
    expect(http.requests).toHaveLength(2);
    expect(outcome.kind === "success" && outcome.data.items).toEqual([track]);
    expect(outcome.kind === "success" && outcome.data.restartedFromFirstPage).toBe(true);
  });
});

describe("getLikedPlaylist", () => {
  const route = "/playlists/liked";

  it("returns the liked playlist, without thumbnail_urls, with its total count and duration", async () => {
    const liked = { ...likedDetail, total_count: 3, total_duration_seconds: 600 };
    const { service, http } = setupDetail(route, () => ({ body: { ok: true, data: liked } }));
    expect(await service.getLikedPlaylist()).toEqual({
      kind: "success",
      maxAgeSeconds: 0,
      data: liked,
    });
    expect(http.requests[0]?.url).toBe("test://api/playlists/liked");
    const outcome = await service.getLikedPlaylist();
    expect(outcome.kind === "success" && "thumbnail_urls" in outcome.data).toBe(false);
  });

  it("returns the liked playlist with zero count and duration as a success when there are no likes", async () => {
    const { service } = setupDetail(route, () => ({ body: { ok: true, data: likedDetail } }));
    const outcome = await service.getLikedPlaylist();
    expect(outcome.kind === "success" && outcome.data.total_count).toBe(0);
    expect(outcome.kind === "success" && outcome.data.total_duration_seconds).toBe(0);
  });

  it("fails with a timeout outcome when the API does not answer", async () => {
    vi.useFakeTimers();
    const { service } = setupDetail(route, never);
    const pending = service.getLikedPlaylist();
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS + 1);
    expect(await pending).toEqual({ kind: "transport_failure", cause: "timeout" });
  });

  it("fails with a network outcome when the request cannot be sent", async () => {
    const { service } = setupDetail(route, () => Promise.reject(new Error("offline")));
    expect(await service.getLikedPlaylist()).toEqual({
      kind: "transport_failure",
      cause: "network",
    });
  });

  it("fails with a schema outcome when total_duration_seconds is null", async () => {
    const { service } = setupDetail(route, () => ({
      body: { ok: true, data: { ...likedDetail, total_duration_seconds: null } },
    }));
    expect(await service.getLikedPlaylist()).toEqual({
      kind: "transport_failure",
      cause: "schema",
    });
  });
});

describe("listLikedTracks", () => {
  const route = "/playlists/liked/tracks";

  it("returns the first page of liked tracks", async () => {
    const page = { limit: 50, next_cursor: "c1", has_more: true, total: 2 };
    const { service, http } = setupDetail(route, () => ({ body: pageBody([track], page) }));
    expect(await service.listLikedTracks(null)).toEqual({
      kind: "success",
      maxAgeSeconds: 0,
      data: { items: [track], page, restartedFromFirstPage: false },
    });
    expect(http.requests[0]?.url).toBe("test://api/playlists/liked/tracks");
  });

  it("returns an empty first page as a success when there are no likes", async () => {
    const page = { limit: 50, next_cursor: null, has_more: false, total: 0 };
    const { service } = setupDetail(route, () => ({ body: pageBody([], page) }));
    const outcome = await service.listLikedTracks(null);
    expect(outcome.kind === "success" && outcome.data.items).toEqual([]);
  });

  it("fails with a timeout outcome when the API does not answer", async () => {
    vi.useFakeTimers();
    const { service } = setupDetail(route, never);
    const pending = service.listLikedTracks(null);
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS + 1);
    expect(await pending).toEqual({ kind: "transport_failure", cause: "timeout" });
  });

  it("fails with a network outcome when the request cannot be sent", async () => {
    const { service } = setupDetail(route, () => Promise.reject(new Error("offline")));
    expect(await service.listLikedTracks(null)).toEqual({
      kind: "transport_failure",
      cause: "network",
    });
  });

  it("fails with a schema outcome when a track has no position", async () => {
    const page = { limit: 50, next_cursor: null, has_more: false, total: 1 };
    const broken: Record<string, unknown> = { ...track };
    delete broken.position;
    const { service } = setupDetail(route, () => ({ body: pageBody([broken], page) }));
    expect(await service.listLikedTracks(null)).toEqual({
      kind: "transport_failure",
      cause: "schema",
    });
  });

  it("sends the cursor and returns the second page", async () => {
    const page = { limit: 50, next_cursor: null, has_more: false, total: 2 };
    const second = { ...track, track_id: "t2", position: 2 };
    const { service, http } = setupDetail(route, () => ({ body: pageBody([second], page) }));
    const outcome = await service.listLikedTracks("c1");
    expect(http.requests[0]?.url).toContain("cursor=c1");
    expect(outcome.kind === "success" && outcome.data.items).toEqual([second]);
  });

  it("drops a stale cursor and returns the first page on invalid_cursor", async () => {
    const page = { limit: 50, next_cursor: null, has_more: false, total: 1 };
    const { service, http } = setupDetail(route, (req) =>
      req.query.cursor === undefined
        ? { body: pageBody([track], page) }
        : { status: 422, body: { ok: false, reason: "invalid_cursor" } },
    );
    const outcome = await service.listLikedTracks("stale");
    expect(http.requests).toHaveLength(2);
    expect(outcome.kind === "success" && outcome.data.restartedFromFirstPage).toBe(true);
  });
});

function setupRoutes(handlers: Record<string, Handler>) {
  const http = createFakeHttp(handlers, BASE_URL);
  const client = createHttpClient({
    http: http.port,
    auth: createFakeAuth().port,
    log: createFakeLog().port,
    baseUrl: BASE_URL,
  });
  return { service: createPlaylistsService(client), http };
}

const failureOf = (status: number, reason: string) => () => ({
  status,
  body: { ok: false, reason },
});

const addInput: AddTrackInput = {
  track_id: "t 1",
  title: "Song",
  artists: [{ id: "ar1", name: "Artist" }],
  album: "Album",
  album_id: "al1",
  thumbnail_url: "test://img/t1",
  duration_seconds: 200,
};
const addedTrack = {
  track_id: "t 1",
  title: "Song",
  artists: [{ id: "ar1", name: "Artist" }],
  album: "Album",
  album_id: "al1",
  duration_seconds: 200,
  thumbnail_url: "test://img/t1",
  position: 3,
};

describe("listPlaylistsWithTrack", () => {
  const route = "GET /playlists/owned-with-track/t%201";

  it("returns the ids of the caller's playlists that hold the track", async () => {
    const { service, http } = setupRoutes({
      [route]: () => ({
        headers: { "cache-control": "private, no-cache" },
        body: { ok: true, data: { playlist_ids: ["p1", "p2"] } },
      }),
    });
    expect(await service.listPlaylistsWithTrack("t 1")).toEqual({
      kind: "success",
      data: { playlist_ids: ["p1", "p2"] },
      maxAgeSeconds: 0,
    });
    expect(http.requests[0]?.url).toBe("test://api/playlists/owned-with-track/t%201");
  });

  it("returns playlist_ids [] as a success when the track is in none", async () => {
    const { service } = setupRoutes({
      [route]: () => ({ body: { ok: true, data: { playlist_ids: [] } } }),
    });
    expect(await service.listPlaylistsWithTrack("t 1")).toEqual({
      kind: "success",
      data: { playlist_ids: [] },
      maxAgeSeconds: 0,
    });
  });

  it("surfaces upstream_error as an api failure", async () => {
    const { service } = setupRoutes({ [route]: failureOf(502, "upstream_error") });
    expect(await service.listPlaylistsWithTrack("t 1")).toEqual({
      kind: "api_failure",
      reason: "upstream_error",
    });
  });

  it("fails with a timeout outcome when the API does not answer", async () => {
    vi.useFakeTimers();
    const { service } = setupRoutes({ [route]: never });
    const pending = service.listPlaylistsWithTrack("t 1");
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS + 1);
    expect(await pending).toEqual({ kind: "transport_failure", cause: "timeout" });
  });

  it("fails with a network outcome when the request cannot be sent", async () => {
    const { service } = setupRoutes({ [route]: () => Promise.reject(new Error("offline")) });
    expect(await service.listPlaylistsWithTrack("t 1")).toEqual({
      kind: "transport_failure",
      cause: "network",
    });
  });

  it("fails with a schema outcome when playlist_ids is null", async () => {
    const { service } = setupRoutes({
      [route]: () => ({ body: { ok: true, data: { playlist_ids: null } } }),
    });
    expect(await service.listPlaylistsWithTrack("t 1")).toEqual({
      kind: "transport_failure",
      cause: "schema",
    });
  });
});

describe("addTrackToPlaylist", () => {
  const route = "POST /playlists/p%201/tracks";

  it("posts the whole body and returns alreadyThere false", async () => {
    const { service, http } = setupRoutes({
      [route]: () => ({ status: 201, body: { ok: true, data: addedTrack } }),
    });
    expect(await service.addTrackToPlaylist("p 1", addInput)).toEqual({
      kind: "success",
      data: { alreadyThere: false },
      maxAgeSeconds: 0,
    });
    expect(http.requests[0]?.method).toBe("POST");
    expect(http.requests[0]?.url).toBe("test://api/playlists/p%201/tracks");
    expect(JSON.parse(http.requests[0]?.body ?? "null")).toEqual(addInput);
  });

  it("treats track_already_in_playlist as added", async () => {
    const { service } = setupRoutes({ [route]: failureOf(409, "track_already_in_playlist") });
    expect(await service.addTrackToPlaylist("p 1", addInput)).toEqual({
      kind: "success",
      data: { alreadyThere: true },
      maxAgeSeconds: 0,
    });
  });

  it("surfaces playlist_not_found as an api failure", async () => {
    const { service } = setupRoutes({ [route]: failureOf(404, "playlist_not_found") });
    expect(await service.addTrackToPlaylist("p 1", addInput)).toEqual({
      kind: "api_failure",
      reason: "playlist_not_found",
    });
  });

  it("fails with a timeout outcome when the API does not answer", async () => {
    vi.useFakeTimers();
    const { service } = setupRoutes({ [route]: never });
    const pending = service.addTrackToPlaylist("p 1", addInput);
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS + 1);
    expect(await pending).toEqual({ kind: "transport_failure", cause: "timeout" });
  });

  it("fails with a network outcome when the request cannot be sent", async () => {
    const { service } = setupRoutes({ [route]: () => Promise.reject(new Error("offline")) });
    expect(await service.addTrackToPlaylist("p 1", addInput)).toEqual({
      kind: "transport_failure",
      cause: "network",
    });
  });

  it("fails with a schema outcome when the response has no position", async () => {
    const { service } = setupRoutes({
      [route]: () => ({ body: { ok: true, data: { ...addedTrack, position: undefined } } }),
    });
    expect(await service.addTrackToPlaylist("p 1", addInput)).toEqual({
      kind: "transport_failure",
      cause: "schema",
    });
  });
});

describe("createPlaylistWithTrack", () => {
  it("creates the playlist, then adds the track to it", async () => {
    const { service, http } = setupRoutes({
      "POST /playlists": () => ({ status: 201, body: { ok: true, data: created } }),
      "POST /playlists/p9/tracks": () => ({ status: 201, body: { ok: true, data: addedTrack } }),
    });
    expect(await service.createPlaylistWithTrack("New one", addInput)).toEqual({
      kind: "success",
      data: { playlist: created },
      maxAgeSeconds: 0,
    });
    expect(http.requests.map((r) => `${r.method} ${r.url}`)).toEqual([
      "POST test://api/playlists",
      "POST test://api/playlists/p9/tracks",
    ]);
    expect(JSON.parse(http.requests[0]?.body ?? "null")).toEqual({
      title: "New one",
      is_public: false,
    });
  });

  it("returns invalid_request from the create and sends no add", async () => {
    const { service, http } = setupRoutes({
      "POST /playlists": failureOf(422, "invalid_request"),
    });
    expect(await service.createPlaylistWithTrack("", addInput)).toEqual({
      kind: "api_failure",
      reason: "invalid_request",
    });
    expect(http.requests).toHaveLength(1);
  });

  it("returns the add's failure after the playlist was created", async () => {
    const { service, http } = setupRoutes({
      "POST /playlists": () => ({ status: 201, body: { ok: true, data: created } }),
      "POST /playlists/p9/tracks": failureOf(502, "upstream_error"),
    });
    expect(await service.createPlaylistWithTrack("New one", addInput)).toEqual({
      kind: "api_failure",
      reason: "upstream_error",
    });
    expect(http.requests).toHaveLength(2);
  });

  it("fails with a timeout outcome on the create", async () => {
    vi.useFakeTimers();
    const { service } = setupRoutes({ "POST /playlists": never });
    const pending = service.createPlaylistWithTrack("New one", addInput);
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS + 1);
    expect(await pending).toEqual({ kind: "transport_failure", cause: "timeout" });
  });

  it("fails with a network outcome on the add", async () => {
    const { service } = setupRoutes({
      "POST /playlists": () => ({ status: 201, body: { ok: true, data: created } }),
      "POST /playlists/p9/tracks": () => Promise.reject(new Error("offline")),
    });
    expect(await service.createPlaylistWithTrack("New one", addInput)).toEqual({
      kind: "transport_failure",
      cause: "network",
    });
  });
});

describe("removeTrackFromPlaylist", () => {
  const route = "DELETE /playlists/p%201/tracks/t%201";

  it("deletes the track and succeeds with data null", async () => {
    const { service, http } = setupRoutes({
      [route]: () => ({ body: { ok: true, data: null } }),
    });
    expect(await service.removeTrackFromPlaylist("p 1", "t 1")).toEqual({
      kind: "success",
      data: null,
      maxAgeSeconds: 0,
    });
    expect(http.requests[0]?.method).toBe("DELETE");
    expect(http.requests[0]?.url).toBe("test://api/playlists/p%201/tracks/t%201");
  });

  it("succeeds the same way when the track is not in the playlist", async () => {
    const { service } = setupRoutes({
      [route]: () => ({ body: { ok: true, data: null } }),
    });
    const outcome = await service.removeTrackFromPlaylist("p 1", "t 1");
    expect(outcome.kind).toBe("success");
  });

  it("surfaces playlist_not_found as an api failure", async () => {
    const { service } = setupRoutes({ [route]: failureOf(404, "playlist_not_found") });
    expect(await service.removeTrackFromPlaylist("p 1", "t 1")).toEqual({
      kind: "api_failure",
      reason: "playlist_not_found",
    });
  });

  it("fails with a timeout outcome when the API does not answer", async () => {
    vi.useFakeTimers();
    const { service } = setupRoutes({ [route]: never });
    const pending = service.removeTrackFromPlaylist("p 1", "t 1");
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS + 1);
    expect(await pending).toEqual({ kind: "transport_failure", cause: "timeout" });
  });

  it("fails with a network outcome when the request cannot be sent", async () => {
    const { service } = setupRoutes({ [route]: () => Promise.reject(new Error("offline")) });
    expect(await service.removeTrackFromPlaylist("p 1", "t 1")).toEqual({
      kind: "transport_failure",
      cause: "network",
    });
  });

  it("fails with a schema outcome when data is an object", async () => {
    const { service } = setupRoutes({
      [route]: () => ({ body: { ok: true, data: { removed: true } } }),
    });
    expect(await service.removeTrackFromPlaylist("p 1", "t 1")).toEqual({
      kind: "transport_failure",
      cause: "schema",
    });
  });
});

describe("addTrackInputOf", () => {
  const playable: PlayableTrack = {
    trackId: "t1",
    title: "Song",
    artists: [
      { id: null, name: "Guest" },
      { id: "ar1", name: "Artist" },
    ],
    album: "Album",
    albumId: "al1",
    coverUrl: "test://img/t1",
    durationSeconds: 200,
  };

  it("maps a full track and drops the artists without an id", () => {
    expect(addTrackInputOf(playable)).toEqual({
      track_id: "t1",
      title: "Song",
      artists: [{ id: "ar1", name: "Artist" }],
      album: "Album",
      album_id: "al1",
      thumbnail_url: "test://img/t1",
      duration_seconds: 200,
    });
  });

  it.each([
    ["album", { album: null }],
    ["album id", { albumId: null }],
    ["cover", { coverUrl: null }],
    ["duration", { durationSeconds: null }],
    ["artist with an id", { artists: [{ id: null, name: "Guest" }] }],
  ])("returns null without %s", (_name, patch) => {
    expect(addTrackInputOf({ ...playable, ...patch })).toBeNull();
  });
});

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
// - getSavedState reads saved true and false, surfaces the listed reasons, fails on transport
// - saveItem posts the body and returns the stored item, surfaces the listed reasons, fails on transport
// - removeItem deletes and returns null, surfaces library_item_not_found and the listed reasons, fails on transport
// - albumLibraryInputOf, genrePlaylistLibraryInputOf and artistLibraryInputOf build the bodies and omit what is missing
// - listLibrary with kind artist sends kind, returns only artists, empty, restarts keeping kind, fails on transport
// - An artist entry parses in the unfiltered library; getSavedState, saveItem and removeItem work for kind artist
//
// What is covered:
// - Happy path, expected empty state, api failure, transport failure, pagination, request bodies
//
// Run with: pnpm --filter @beatly/core test -- library
//
// SEE: packages/core/src/services/library.ts

import { afterEach, describe, expect, it, vi } from "vitest";

import { createHttpClient, DEFAULT_TIMEOUT_MS } from "../../src/http/client.ts";
import type { Album } from "../../src/domain/album.ts";
import {
  albumLibraryInputOf,
  artistLibraryInputOf,
  createLibraryService,
  genrePlaylistLibraryInputOf,
} from "../../src/services/library.ts";
import { createFakeAuth } from "../fakes/auth.ts";
import { createFakeHttp, never, type Handler } from "../fakes/http.ts";
import { tiers } from "../fakes/images.ts";
import { createFakeLog } from "../fakes/log.ts";

const BASE_URL = "test://api";

const liked = {
  kind: "playlist",
  id: "liked",
  title: "liked",
  thumbnail_url: null,
  image: null,
  subtitle: null,
  source: "liked",
  thumbnail_urls: [],
  mosaic: [],
};
const ownPlaylist = {
  kind: "playlist",
  id: "p1",
  title: "Road trip",
  thumbnail_url: null,
  image: null,
  subtitle: null,
  source: "user",
  thumbnail_urls: ["test://img/1", "test://img/2", "test://img/3", "test://img/4"],
  mosaic: [tiers("1"), tiers("2"), tiers("3"), tiers("4")],
};
const savedAlbum = {
  kind: "album",
  id: "a1",
  title: "Some album",
  thumbnail_url: "test://img/a1",
  image: tiers("a1"),
  subtitle: "Some artist",
  source: "external",
  thumbnail_urls: [],
  mosaic: [],
};

const savedArtist = {
  kind: "artist",
  id: "UC1",
  title: "Some artist",
  thumbnail_url: "test://img/UC1",
  image: tiers("UC1"),
  subtitle: null,
  source: "external",
  thumbnail_urls: [],
  mosaic: [],
};

function pageBody(items: unknown[], page: Record<string, unknown>) {
  return { ok: true, data: { items, page } };
}

function setup(handler: Handler) {
  return setupRoutes({ "GET /library": handler });
}

function setupRoutes(routes: Record<string, Handler>) {
  const http = createFakeHttp(routes, BASE_URL);
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
    expect(liked).toMatchObject({ image: null, mosaic: [] });
    expect(ownPlaylist.mosaic).toEqual([tiers("1"), tiers("2"), tiers("3"), tiers("4")]);
    expect(savedAlbum.image).toEqual(tiers("a1"));
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
      body: pageBody([{ ...ownPlaylist, kind: "podcast" }], page),
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

describe("listLibrary with kind artist", () => {
  const emptyPage = { limit: 50, next_cursor: null, has_more: false, total: 0 };

  it("sends kind=artist and returns only the artists, with no liked entry", async () => {
    const page = { limit: 50, next_cursor: null, has_more: false, total: 1 };
    const { service, http } = setup(() => ({ body: pageBody([savedArtist], page) }));
    const outcome = await service.listLibrary(null, "artist");
    expect(http.requests[0]?.url).toContain("kind=artist");
    expect(outcome.kind === "success" && outcome.data.items).toEqual([savedArtist]);
    expect(savedArtist).toMatchObject({ kind: "artist", source: "external", subtitle: null });
  });

  it("returns an empty first page as a success when no artist is saved", async () => {
    const { service } = setup(() => ({ body: pageBody([], emptyPage) }));
    const outcome = await service.listLibrary(null, "artist");
    expect(outcome.kind).toBe("success");
    expect(outcome.kind === "success" && outcome.data.items).toEqual([]);
    expect(outcome.kind === "success" && outcome.data.page).toEqual(emptyPage);
  });

  it("sends the cursor with kind=artist and returns the second page", async () => {
    const { service, http } = setup(() => ({ body: pageBody([savedArtist], emptyPage) }));
    const outcome = await service.listLibrary("c1", "artist");
    expect(http.requests[0]?.url).toContain("cursor=c1");
    expect(http.requests[0]?.url).toContain("kind=artist");
    expect(outcome.kind === "success" && outcome.data.items).toEqual([savedArtist]);
  });

  it("drops a stale cursor and refetches the first page with kind=artist on invalid_cursor", async () => {
    const { service, http } = setup((req) =>
      req.query.cursor === undefined
        ? { body: pageBody([savedArtist], emptyPage) }
        : { status: 422, body: { ok: false, reason: "invalid_cursor" } },
    );
    const outcome = await service.listLibrary("stale", "artist");
    expect(http.requests).toHaveLength(2);
    expect(http.requests[0]?.url).toContain("kind=artist");
    expect(http.requests[1]?.url).toContain("kind=artist");
    expect(http.requests[1]?.url).not.toContain("cursor");
    expect(outcome.kind === "success" && outcome.data.restartedFromFirstPage).toBe(true);
  });

  it("fails with a timeout outcome when the API does not answer", async () => {
    vi.useFakeTimers();
    const { service } = setup(never);
    const pending = service.listLibrary(null, "artist");
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS + 1);
    expect(await pending).toEqual({ kind: "transport_failure", cause: "timeout" });
  });

  it("fails with a network outcome when the request cannot be sent", async () => {
    const { service } = setup(() => Promise.reject(new Error("offline")));
    expect(await service.listLibrary(null, "artist")).toEqual({
      kind: "transport_failure",
      cause: "network",
    });
  });

  it("fails with a schema outcome when an artist entry has no id", async () => {
    const broken: Record<string, unknown> = { ...savedArtist };
    delete broken.id;
    const { service } = setup(() => ({ body: pageBody([broken], emptyPage) }));
    expect(await service.listLibrary(null, "artist")).toEqual({
      kind: "transport_failure",
      cause: "schema",
    });
  });

  it("parses an artist entry in the unfiltered library", async () => {
    const { service, http } = setup(() => ({ body: pageBody([liked, savedArtist], emptyPage) }));
    const outcome = await service.listLibrary(null);
    expect(http.requests[0]?.url).toBe("test://api/library");
    expect(outcome.kind === "success" && outcome.data.items).toEqual([liked, savedArtist]);
  });
});

const REASONS = ["invalid_request", "unauthorized", "upstream_error", "upstream_timeout"] as const;

const storedItem = {
  kind: "album",
  external_id: "a1",
  title: "Some album",
  thumbnail_url: null,
  image: null,
  artist: "Some artist",
  artist_id: null,
  album_id: "a1",
  album_name: "Some album",
  source: "external",
  added_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-01T00:00:00Z",
};

const itemInput = {
  kind: "album",
  source: "external",
  external_id: "a1",
  title: "Some album",
} as const;

describe("getSavedState", () => {
  const route = (handler: Handler) => setupRoutes({ "GET /library/album/a1": handler });

  it("returns saved true for a saved album", async () => {
    const { service, http } = route(() => ({
      headers: { "cache-control": "private, no-cache" },
      body: { ok: true, data: { saved: true } },
    }));
    expect(await service.getSavedState("album", "a1")).toEqual({
      kind: "success",
      maxAgeSeconds: 0,
      data: { saved: true },
    });
    expect(http.requests[0]?.url).toBe("test://api/library/album/a1");
  });

  it("returns saved false as a success for an item not saved", async () => {
    const { service } = route(() => ({ body: { ok: true, data: { saved: false } } }));
    const outcome = await service.getSavedState("album", "a1");
    expect(outcome.kind).toBe("success");
    expect(outcome.kind === "success" && outcome.data).toEqual({ saved: false });
  });

  it.each(REASONS)("surfaces %s as an api failure", async (reason) => {
    const { service } = route(() => ({ status: 400, body: { ok: false, reason } }));
    expect(await service.getSavedState("album", "a1")).toEqual({ kind: "api_failure", reason });
  });

  it("fails with a timeout outcome when the API does not answer", async () => {
    vi.useFakeTimers();
    const { service } = route(never);
    const pending = service.getSavedState("album", "a1");
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS + 1);
    expect(await pending).toEqual({ kind: "transport_failure", cause: "timeout" });
  });

  it("fails with a network outcome when the request cannot be sent", async () => {
    const { service } = route(() => Promise.reject(new Error("offline")));
    expect(await service.getSavedState("album", "a1")).toEqual({
      kind: "transport_failure",
      cause: "network",
    });
  });

  it("fails with a schema outcome when saved is not a boolean", async () => {
    const { service } = route(() => ({ body: { ok: true, data: { saved: "yes" } } }));
    expect(await service.getSavedState("album", "a1")).toEqual({
      kind: "transport_failure",
      cause: "schema",
    });
  });
});

describe("saveItem", () => {
  const route = (handler: Handler) => setupRoutes({ "POST /library": handler });

  it("posts the body and returns the stored item", async () => {
    const { service, http } = route(() => ({ body: { ok: true, data: storedItem } }));
    const outcome = await service.saveItem(itemInput);
    expect(outcome).toEqual({ kind: "success", maxAgeSeconds: 0, data: storedItem });
    expect(http.requests[0]?.method).toBe("POST");
    expect(http.requests[0]?.url).toBe("test://api/library");
    expect(JSON.parse(http.requests[0]?.body ?? "null")).toEqual(itemInput);
  });

  it.each(REASONS)("surfaces %s as an api failure", async (reason) => {
    const { service } = route(() => ({ status: 400, body: { ok: false, reason } }));
    expect(await service.saveItem(itemInput)).toEqual({ kind: "api_failure", reason });
  });

  it("fails with a timeout outcome when the API does not answer", async () => {
    vi.useFakeTimers();
    const { service } = route(never);
    const pending = service.saveItem(itemInput);
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS + 1);
    expect(await pending).toEqual({ kind: "transport_failure", cause: "timeout" });
  });

  it("fails with a network outcome when the request cannot be sent", async () => {
    const { service } = route(() => Promise.reject(new Error("offline")));
    expect(await service.saveItem(itemInput)).toEqual({
      kind: "transport_failure",
      cause: "network",
    });
  });

  it("fails with a schema outcome when the item has no external_id", async () => {
    const broken: Record<string, unknown> = { ...storedItem };
    delete broken.external_id;
    const { service } = route(() => ({ body: { ok: true, data: broken } }));
    expect(await service.saveItem(itemInput)).toEqual({
      kind: "transport_failure",
      cause: "schema",
    });
  });
});

describe("removeItem", () => {
  const route = (handler: Handler) => setupRoutes({ "DELETE /library/album/a1": handler });

  it("deletes the item and returns null", async () => {
    const { service, http } = route(() => ({ body: { ok: true, data: null } }));
    expect(await service.removeItem("album", "a1")).toEqual({
      kind: "success",
      maxAgeSeconds: 0,
      data: null,
    });
    expect(http.requests[0]?.method).toBe("DELETE");
    expect(http.requests[0]?.url).toBe("test://api/library/album/a1");
  });

  it("surfaces library_item_not_found as an api failure", async () => {
    const { service } = route(() => ({
      status: 404,
      body: { ok: false, reason: "library_item_not_found" },
    }));
    expect(await service.removeItem("album", "a1")).toEqual({
      kind: "api_failure",
      reason: "library_item_not_found",
    });
  });

  it.each(REASONS)("surfaces %s as an api failure", async (reason) => {
    const { service } = route(() => ({ status: 400, body: { ok: false, reason } }));
    expect(await service.removeItem("album", "a1")).toEqual({ kind: "api_failure", reason });
  });

  it("fails with a timeout outcome when the API does not answer", async () => {
    vi.useFakeTimers();
    const { service } = route(never);
    const pending = service.removeItem("album", "a1");
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS + 1);
    expect(await pending).toEqual({ kind: "transport_failure", cause: "timeout" });
  });

  it("fails with a network outcome when the request cannot be sent", async () => {
    const { service } = route(() => Promise.reject(new Error("offline")));
    expect(await service.removeItem("album", "a1")).toEqual({
      kind: "transport_failure",
      cause: "network",
    });
  });

  it("fails with a schema outcome when data is not null", async () => {
    const { service } = route(() => ({ body: { ok: true, data: { removed: true } } }));
    expect(await service.removeItem("album", "a1")).toEqual({
      kind: "transport_failure",
      cause: "schema",
    });
  });
});

function albumOf(overrides: Partial<Album>): Album {
  return {
    id: "a1",
    title: "Some album",
    year: null,
    artists: [{ id: "ar1", name: "Some artist" }],
    track_count: null,
    duration_seconds: 0,
    audio_playlist_id: null,
    thumbnail_url: "test://img/a1",
    image: tiers("a1"),
    tracks: [],
    other_versions: [],
    related_recommendations: [],
    ...overrides,
  };
}

const artistInput = {
  kind: "artist",
  source: "external",
  external_id: "UC1",
  title: "Some artist",
  thumbnail_url: "test://img/UC1",
} as const;

describe("artist items", () => {
  const stored = {
    ...storedItem,
    kind: "artist",
    external_id: "UC1",
    title: "Some artist",
    thumbnail_url: "test://img/UC1",
    artist: null,
    album_id: null,
    album_name: null,
  };

  it("returns saved true for a saved artist", async () => {
    const { service, http } = setupRoutes({
      "GET /library/artist/UC1": () => ({ body: { ok: true, data: { saved: true } } }),
    });
    const outcome = await service.getSavedState("artist", "UC1");
    expect(outcome.kind === "success" && outcome.data).toEqual({ saved: true });
    expect(http.requests[0]?.url).toBe("test://api/library/artist/UC1");
  });

  it("returns saved false as a success for an artist not saved", async () => {
    const { service } = setupRoutes({
      "GET /library/artist/UC1": () => ({ body: { ok: true, data: { saved: false } } }),
    });
    const outcome = await service.getSavedState("artist", "UC1");
    expect(outcome.kind).toBe("success");
    expect(outcome.kind === "success" && outcome.data).toEqual({ saved: false });
  });

  it("surfaces upstream_error of the saved read as an api failure", async () => {
    const { service } = setupRoutes({
      "GET /library/artist/UC1": () => ({
        status: 502,
        body: { ok: false, reason: "upstream_error" },
      }),
    });
    expect(await service.getSavedState("artist", "UC1")).toEqual({
      kind: "api_failure",
      reason: "upstream_error",
    });
  });

  it("posts the artist body and returns the stored artist item", async () => {
    const { service, http } = setupRoutes({
      "POST /library": () => ({ body: { ok: true, data: stored } }),
    });
    const outcome = await service.saveItem(artistInput);
    expect(outcome.kind === "success" && outcome.data).toMatchObject({
      kind: "artist",
      external_id: "UC1",
    });
    expect(JSON.parse(http.requests[0]?.body ?? "null")).toEqual(artistInput);
  });

  it("surfaces upstream_error of the artist save as an api failure", async () => {
    const { service } = setupRoutes({
      "POST /library": () => ({ status: 502, body: { ok: false, reason: "upstream_error" } }),
    });
    expect(await service.saveItem(artistInput)).toEqual({
      kind: "api_failure",
      reason: "upstream_error",
    });
  });

  it("deletes the artist and returns null", async () => {
    const { service, http } = setupRoutes({
      "DELETE /library/artist/UC1": () => ({ body: { ok: true, data: null } }),
    });
    const outcome = await service.removeItem("artist", "UC1");
    expect(outcome.kind === "success" && outcome.data).toBeNull();
    expect(http.requests[0]?.url).toBe("test://api/library/artist/UC1");
  });

  it("surfaces library_item_not_found as an api failure for an artist", async () => {
    const { service } = setupRoutes({
      "DELETE /library/artist/UC1": () => ({
        status: 404,
        body: { ok: false, reason: "library_item_not_found" },
      }),
    });
    expect(await service.removeItem("artist", "UC1")).toEqual({
      kind: "api_failure",
      reason: "library_item_not_found",
    });
  });
});

describe("library input builders", () => {
  it("albumLibraryInputOf builds the album body with the artist names, first artist id and cover", () => {
    expect(albumLibraryInputOf("a1", albumOf({}), "Some artist")).toEqual({
      kind: "album",
      source: "external",
      external_id: "a1",
      title: "Some album",
      album_id: "a1",
      album_name: "Some album",
      thumbnail_url: "test://img/a1",
      artist: "Some artist",
      artist_id: "ar1",
    });
  });

  it("omits artist, artist_id and thumbnail_url when the album has none", () => {
    const input = albumLibraryInputOf("a1", albumOf({ artists: [], thumbnail_url: null }), null);
    expect(input).not.toHaveProperty("artist");
    expect(input).not.toHaveProperty("artist_id");
    expect(input).not.toHaveProperty("thumbnail_url");
  });

  it("genrePlaylistLibraryInputOf builds the genre body without an artist", () => {
    const input = genrePlaylistLibraryInputOf("g1", "Rock", "test://img/g1");
    expect(input).toEqual({
      kind: "playlist",
      source: "genre",
      external_id: "g1",
      title: "Rock",
      thumbnail_url: "test://img/g1",
    });
    expect(input).not.toHaveProperty("artist");
  });

  it("omits thumbnail_url without a cover", () => {
    expect(genrePlaylistLibraryInputOf("g1", "Rock", null)).not.toHaveProperty("thumbnail_url");
  });

  it("artistLibraryInputOf builds the artist body without album or artist optionals", () => {
    expect(artistLibraryInputOf("UC1", "Some artist", "test://img/UC1")).toEqual(artistInput);
  });

  it("omits thumbnail_url from the artist body without a photo", () => {
    expect(artistLibraryInputOf("UC1", "Some artist", null)).not.toHaveProperty("thumbnail_url");
  });
});

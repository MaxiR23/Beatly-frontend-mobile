// packages/core/test/services/genres.test.ts
//
// Tests for the genres service.
//
// Tested:
// - listGenres returns the genres in API order
// - listGenrePlaylists returns a genre's playlists with their covers and categories
// - listGenreCategories returns a genre's categories as strings
// - Each returns an empty first page as a success
// - Each surfaces its api failure and fails with a timeout, network or schema outcome
//
// What is covered:
// - Happy path, expected empty state, api failure, transport failure
//
// Run with: pnpm --filter @beatly/core test -- genres
//
// SEE: packages/core/src/services/genres.ts

import { afterEach, describe, expect, it, vi } from "vitest";

import { createHttpClient, DEFAULT_TIMEOUT_MS } from "../../src/http/client.ts";
import { createGenresService } from "../../src/services/genres.ts";
import { createFakeAuth } from "../fakes/auth.ts";
import { createFakeHttp, never, type Handler } from "../fakes/http.ts";
import { createFakeLog } from "../fakes/log.ts";

const BASE_URL = "test://api";

function page(total: number) {
  return { limit: 50, next_cursor: null, has_more: false, total };
}

function setup(route: string, handler: Handler) {
  const http = createFakeHttp({ [`GET ${route}`]: handler }, BASE_URL);
  const client = createHttpClient({
    http: http.port,
    auth: createFakeAuth().port,
    log: createFakeLog().port,
    baseUrl: BASE_URL,
  });
  return { service: createGenresService(client), http };
}

afterEach(() => {
  vi.useRealTimers();
});

const playlist = {
  id: "gp1",
  title: "Pop hits",
  description: null,
  thumbnail_url: "test://img/cover",
  track_count: 12,
  category: "Hits",
  thumbnail_urls: ["test://img/1", "test://img/2", "test://img/3", "test://img/4"],
};

describe("listGenres", () => {
  const route = "/genres";

  it("returns the genres in the order the API sends them", async () => {
    const items = [
      { slug: "pop", name: "Pop", description: "Pop music" },
      { slug: "rock", name: "Rock", description: null },
    ];
    const { service, http } = setup(route, () => ({
      headers: { "cache-control": "no-store" },
      body: { ok: true, data: { items, page: page(2) } },
    }));
    expect(await service.listGenres()).toEqual({
      kind: "success",
      maxAgeSeconds: 0,
      data: { items, page: page(2), restartedFromFirstPage: false },
    });
    expect(http.requests[0]?.url).toBe("test://api/genres");
  });

  it("returns an empty first page as a success when there are no genres", async () => {
    const { service } = setup(route, () => ({
      body: { ok: true, data: { items: [], page: page(0) } },
    }));
    const outcome = await service.listGenres();
    expect(outcome.kind).toBe("success");
    expect(outcome.kind === "success" && outcome.data.items).toEqual([]);
    expect(outcome.kind === "success" && outcome.data.page.total).toBe(0);
  });

  it("surfaces upstream_error as an api failure", async () => {
    const { service } = setup(route, () => ({
      status: 502,
      body: { ok: false, reason: "upstream_error" },
    }));
    expect(await service.listGenres()).toEqual({ kind: "api_failure", reason: "upstream_error" });
  });

  it("fails with a timeout outcome when the API does not answer", async () => {
    vi.useFakeTimers();
    const { service } = setup(route, never);
    const pending = service.listGenres();
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS + 1);
    expect(await pending).toEqual({ kind: "transport_failure", cause: "timeout" });
  });

  it("fails with a network outcome when the request cannot be sent", async () => {
    const { service } = setup(route, () => Promise.reject(new Error("offline")));
    expect(await service.listGenres()).toEqual({ kind: "transport_failure", cause: "network" });
  });

  it("fails with a schema outcome when a genre has no name", async () => {
    const { service } = setup(route, () => ({
      body: {
        ok: true,
        data: { items: [{ slug: "pop", name: null, description: null }], page: page(1) },
      },
    }));
    expect(await service.listGenres()).toEqual({ kind: "transport_failure", cause: "schema" });
  });
});

describe("listGenrePlaylists", () => {
  const route = "/genres/pop/playlists";

  it("returns a genre's playlists with their covers and categories", async () => {
    const items = [playlist, { ...playlist, id: "gp2", thumbnail_urls: [], category: null }];
    const { service, http } = setup(route, () => ({
      body: { ok: true, data: { items, page: page(2) } },
    }));
    expect(await service.listGenrePlaylists("pop")).toEqual({
      kind: "success",
      maxAgeSeconds: 0,
      data: { items, page: page(2), restartedFromFirstPage: false },
    });
    expect(http.requests[0]?.url).toBe("test://api/genres/pop/playlists");
  });

  it("returns an empty first page as a success when the genre has no playlists", async () => {
    const { service } = setup(route, () => ({
      body: { ok: true, data: { items: [], page: page(0) } },
    }));
    const outcome = await service.listGenrePlaylists("pop");
    expect(outcome.kind).toBe("success");
    expect(outcome.kind === "success" && outcome.data.items).toEqual([]);
  });

  it("surfaces genre_not_found as an api failure", async () => {
    const { service } = setup(route, () => ({
      status: 404,
      body: { ok: false, reason: "genre_not_found" },
    }));
    expect(await service.listGenrePlaylists("pop")).toEqual({
      kind: "api_failure",
      reason: "genre_not_found",
    });
  });

  it("fails with a timeout outcome when the API does not answer", async () => {
    vi.useFakeTimers();
    const { service } = setup(route, never);
    const pending = service.listGenrePlaylists("pop");
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS + 1);
    expect(await pending).toEqual({ kind: "transport_failure", cause: "timeout" });
  });

  it("fails with a network outcome when the request cannot be sent", async () => {
    const { service } = setup(route, () => Promise.reject(new Error("offline")));
    expect(await service.listGenrePlaylists("pop")).toEqual({
      kind: "transport_failure",
      cause: "network",
    });
  });

  it("fails with a schema outcome when thumbnail_urls is null", async () => {
    const { service } = setup(route, () => ({
      body: {
        ok: true,
        data: { items: [{ ...playlist, thumbnail_urls: null }], page: page(1) },
      },
    }));
    expect(await service.listGenrePlaylists("pop")).toEqual({
      kind: "transport_failure",
      cause: "schema",
    });
  });

  it("encodes the slug in the path", async () => {
    const { service, http } = setup("/genres/r%26b/playlists", () => ({
      body: { ok: true, data: { items: [], page: page(0) } },
    }));
    await service.listGenrePlaylists("r&b");
    expect(http.requests[0]?.url).toBe("test://api/genres/r%26b/playlists");
  });
});

describe("listGenreCategories", () => {
  const route = "/genres/pop/categories";

  it("returns a genre's categories as strings", async () => {
    const { service, http } = setup(route, () => ({
      body: { ok: true, data: { items: ["Chill", "Hits"], page: page(2) } },
    }));
    expect(await service.listGenreCategories("pop")).toEqual({
      kind: "success",
      maxAgeSeconds: 0,
      data: { items: ["Chill", "Hits"], page: page(2), restartedFromFirstPage: false },
    });
    expect(http.requests[0]?.url).toBe("test://api/genres/pop/categories");
  });

  it("returns an empty first page as a success when the genre has no categories", async () => {
    const { service } = setup(route, () => ({
      body: { ok: true, data: { items: [], page: page(0) } },
    }));
    const outcome = await service.listGenreCategories("pop");
    expect(outcome.kind).toBe("success");
    expect(outcome.kind === "success" && outcome.data.items).toEqual([]);
  });

  it("surfaces genre_not_found as an api failure", async () => {
    const { service } = setup(route, () => ({
      status: 404,
      body: { ok: false, reason: "genre_not_found" },
    }));
    expect(await service.listGenreCategories("pop")).toEqual({
      kind: "api_failure",
      reason: "genre_not_found",
    });
  });

  it("fails with a timeout outcome when the API does not answer", async () => {
    vi.useFakeTimers();
    const { service } = setup(route, never);
    const pending = service.listGenreCategories("pop");
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS + 1);
    expect(await pending).toEqual({ kind: "transport_failure", cause: "timeout" });
  });

  it("fails with a network outcome when the request cannot be sent", async () => {
    const { service } = setup(route, () => Promise.reject(new Error("offline")));
    expect(await service.listGenreCategories("pop")).toEqual({
      kind: "transport_failure",
      cause: "network",
    });
  });

  it("fails with a schema outcome when a category is not a string", async () => {
    const { service } = setup(route, () => ({
      body: { ok: true, data: { items: [5], page: page(1) } },
    }));
    expect(await service.listGenreCategories("pop")).toEqual({
      kind: "transport_failure",
      cause: "schema",
    });
  });
});

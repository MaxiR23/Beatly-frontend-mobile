// packages/core/test/services/releases.test.ts
//
// Tests for the releases service.
//
// Tested:
// - listReleases returns the first page of new releases with their type, artists and image
// - Accepts an item with image null
// - Returns an empty first page as a success when there are no releases
// - Surfaces upstream_error as an api failure
// - Fails with a timeout, network or schema outcome (an unknown type, a null artist id)
// - Sends the cursor and returns the second page
// - Drops a stale cursor and returns the first page on invalid_cursor
//
// What is covered:
// - Happy path, expected empty state, api failure, transport failure, pagination
//
// Run with: pnpm --filter @beatly/core test -- releases
//
// SEE: packages/core/src/services/releases.ts

import { afterEach, describe, expect, it, vi } from "vitest";

import { createHttpClient, DEFAULT_TIMEOUT_MS } from "../../src/http/client.ts";
import { createReleasesService } from "../../src/services/releases.ts";
import { createFakeAuth } from "../fakes/auth.ts";
import { createFakeHttp, never, type Handler } from "../fakes/http.ts";
import { tiers } from "../fakes/images.ts";
import { createFakeLog } from "../fakes/log.ts";

const BASE_URL = "test://api";
const route = "/releases";

function setup(handler: Handler) {
  const http = createFakeHttp({ [`GET ${route}`]: handler }, BASE_URL);
  const client = createHttpClient({
    http: http.port,
    auth: createFakeAuth().port,
    log: createFakeLog().port,
    baseUrl: BASE_URL,
  });
  return { service: createReleasesService(client), http };
}

afterEach(() => {
  vi.useRealTimers();
});

const release = {
  album_id: "MPREb_1",
  title: "Album",
  type: "single",
  artists: [
    { id: "UC1", name: "Artist A" },
    { id: "UC2", name: "Artist B" },
  ],
  thumbnail_url: "test://img/abc=w544-h544-p-l90-rj",
  image: tiers("abc", null),
};

const emptyPage = { limit: 50, next_cursor: null, has_more: false, total: 0 };

describe("listReleases", () => {
  it("returns the first page of new releases with their type, artists and image", async () => {
    const page = { limit: 50, next_cursor: "c1", has_more: true, total: 2 };
    const { service, http } = setup(() => ({
      headers: { "cache-control": "no-store" },
      body: { ok: true, data: { items: [release], page } },
    }));
    expect(await service.listReleases(null)).toEqual({
      kind: "success",
      maxAgeSeconds: 0,
      data: { items: [release], page, restartedFromFirstPage: false },
    });
    expect(http.requests[0]?.url).toBe("test://api/releases");
  });

  it("accepts an item with image null", async () => {
    const item = { ...release, image: null };
    const { service } = setup(() => ({
      body: { ok: true, data: { items: [item], page: { ...emptyPage, total: 1 } } },
    }));
    const outcome = await service.listReleases(null);
    expect(outcome.kind).toBe("success");
    expect(outcome.kind === "success" && outcome.data.items).toEqual([item]);
  });

  it("returns an empty first page as a success when there are no releases", async () => {
    const { service } = setup(() => ({
      body: { ok: true, data: { items: [], page: emptyPage } },
    }));
    const outcome = await service.listReleases(null);
    expect(outcome.kind).toBe("success");
    expect(outcome.kind === "success" && outcome.data.items).toEqual([]);
    expect(outcome.kind === "success" && outcome.data.page).toEqual(emptyPage);
  });

  it("surfaces upstream_error as an api failure", async () => {
    const { service } = setup(() => ({
      status: 502,
      body: { ok: false, reason: "upstream_error" },
    }));
    expect(await service.listReleases(null)).toEqual({
      kind: "api_failure",
      reason: "upstream_error",
    });
  });

  it("fails with a timeout outcome when the API does not answer", async () => {
    vi.useFakeTimers();
    const { service } = setup(never);
    const pending = service.listReleases(null);
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS + 1);
    expect(await pending).toEqual({ kind: "transport_failure", cause: "timeout" });
  });

  it("fails with a network outcome when the request cannot be sent", async () => {
    const { service } = setup(() => Promise.reject(new Error("offline")));
    expect(await service.listReleases(null)).toEqual({
      kind: "transport_failure",
      cause: "network",
    });
  });

  it("fails with a schema outcome when the type is unknown", async () => {
    const { service } = setup(() => ({
      body: {
        ok: true,
        data: { items: [{ ...release, type: "compilation" }], page: emptyPage },
      },
    }));
    expect(await service.listReleases(null)).toEqual({
      kind: "transport_failure",
      cause: "schema",
    });
  });

  it("fails with a schema outcome when an artist id is null", async () => {
    const { service } = setup(() => ({
      body: {
        ok: true,
        data: {
          items: [{ ...release, artists: [{ id: null, name: "A" }] }],
          page: emptyPage,
        },
      },
    }));
    expect(await service.listReleases(null)).toEqual({
      kind: "transport_failure",
      cause: "schema",
    });
  });

  it("sends the cursor and returns the second page", async () => {
    const second = { ...release, album_id: "MPREb_2", title: "Second" };
    const { service, http } = setup(() => ({
      body: { ok: true, data: { items: [second], page: emptyPage } },
    }));
    const outcome = await service.listReleases("c1");
    expect(http.requests[0]?.url).toContain("cursor=c1");
    expect(outcome.kind === "success" && outcome.data.items).toEqual([second]);
    expect(outcome.kind === "success" && outcome.data.restartedFromFirstPage).toBe(false);
  });

  it("drops a stale cursor and returns the first page on invalid_cursor", async () => {
    const page = { ...emptyPage, total: 1 };
    const { service, http } = setup((req) =>
      req.query.cursor === undefined
        ? { body: { ok: true, data: { items: [release], page } } }
        : { status: 422, body: { ok: false, reason: "invalid_cursor" } },
    );
    const outcome = await service.listReleases("stale");
    expect(http.requests).toHaveLength(2);
    expect(http.requests[1]?.url).not.toContain("cursor");
    expect(outcome.kind === "success" && outcome.data.items).toEqual([release]);
    expect(outcome.kind === "success" && outcome.data.restartedFromFirstPage).toBe(true);
  });
});

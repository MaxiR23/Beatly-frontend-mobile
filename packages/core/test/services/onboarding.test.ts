// packages/core/test/services/onboarding.test.ts
//
// Tests for the onboarding service.
//
// Tested:
// - createOnboardingService().listArtists / similar / complete / finish
//
// What is covered:
// - listArtists: the curated page with its tiers, the empty page, the cursor, invalid_cursor and the three transport failures
// - similar: the posted artist_id and exclude_ids, the empty list, an api failure and the three transport failures
// - complete: the posted ids, an empty skipped list, too_few_artists and the three transport failures
// - finish: complete then generate, the empty recommendations, the first failure returned and generate skipped after a failed complete
//
// Run with: pnpm --filter @beatly/core test -- onboarding
//
// SEE: packages/core/src/services/onboarding.ts

import { afterEach, describe, expect, it, vi } from "vitest";

import { createHttpClient, DEFAULT_TIMEOUT_MS } from "../../src/http/client.ts";
import { createOnboardingService } from "../../src/services/onboarding.ts";
import { createRecommendationsService } from "../../src/services/recommendations.ts";
import { createFakeAuth } from "../fakes/auth.ts";
import { createFakeHttp, never, type Handler } from "../fakes/http.ts";
import { tiers } from "../fakes/images.ts";
import { createFakeLog } from "../fakes/log.ts";

const BASE_URL = "test://api";

const withPhoto = {
  id: "UC1",
  name: "Artist One",
  thumbnail_url: "test://img/1",
  image: tiers("1"),
};
const withoutPhoto = { id: "UC2", name: "Artist Two", thumbnail_url: null, image: null };
const completion = {
  onboarding_completed_at: "2026-10-30T12:00:00+00:00",
  saved: 5,
  skipped: ["UCgone"],
};
const noRecommendations = {
  albums_for_you: [],
  seed_sections: [],
  recommended_albums: [],
  recommended_artists: [],
  artists: [],
  albums: [],
  generated_at: null,
  valid_until: null,
};

function pageBody(items: unknown[], page: Record<string, unknown>) {
  return { ok: true, data: { items, page } };
}

function setup(handlers: {
  list?: Handler;
  similar?: Handler;
  complete?: Handler;
  generate?: Handler;
}) {
  const http = createFakeHttp(
    {
      "GET /onboarding/artists": handlers.list ?? never,
      "POST /onboarding/similar": handlers.similar ?? never,
      "POST /onboarding/complete": handlers.complete ?? never,
      "POST /recommendations/generate": handlers.generate ?? never,
    },
    BASE_URL,
  );
  const client = createHttpClient({
    http: http.port,
    auth: createFakeAuth().port,
    log: createFakeLog().port,
    baseUrl: BASE_URL,
  });
  const service = createOnboardingService(client, createRecommendationsService(client));
  return { service, http };
}

function routes(requests: readonly { method: string; url: string }[]): string[] {
  return requests.map((request) => `${request.method} ${new URL(request.url).pathname}`);
}

afterEach(() => {
  vi.useRealTimers();
});

describe("listArtists", () => {
  it("returns the curated artists of the first page with their image tiers and the page block", async () => {
    const page = { limit: 50, next_cursor: null, has_more: false, total: 2 };
    const { service, http } = setup({
      list: () => ({
        headers: { "cache-control": "private, no-cache" },
        body: pageBody([withPhoto, withoutPhoto], page),
      }),
    });
    expect(await service.listArtists(null)).toEqual({
      kind: "success",
      maxAgeSeconds: 0,
      data: { items: [withPhoto, withoutPhoto], page, restartedFromFirstPage: false },
    });
    expect(http.requests).toHaveLength(1);
    expect(http.requests[0]?.url).toBe("test://api/onboarding/artists");
  });

  it("returns an empty first page (items [], has_more false, next_cursor null, total 0) as a success", async () => {
    const page = { limit: 50, next_cursor: null, has_more: false, total: 0 };
    const { service } = setup({ list: () => ({ body: pageBody([], page) }) });
    const outcome = await service.listArtists(null);
    expect(outcome.kind).toBe("success");
    expect(outcome.kind === "success" && outcome.data.items).toEqual([]);
    expect(outcome.kind === "success" && outcome.data.page).toEqual(page);
  });

  it("fetches the next page with the returned cursor", async () => {
    const page = { limit: 50, next_cursor: null, has_more: false, total: 2 };
    const { service, http } = setup({ list: () => ({ body: pageBody([withoutPhoto], page) }) });
    const outcome = await service.listArtists("c1");
    expect(http.requests[0]?.url).toContain("cursor=c1");
    expect(outcome.kind === "success" && outcome.data.items).toEqual([withoutPhoto]);
    expect(outcome.kind === "success" && outcome.data.restartedFromFirstPage).toBe(false);
  });

  it("drops an invalid_cursor and refetches the first page (restartedFromFirstPage true)", async () => {
    const page = { limit: 50, next_cursor: null, has_more: false, total: 1 };
    const { service, http } = setup({
      list: (req) =>
        req.query.cursor === undefined
          ? { body: pageBody([withPhoto], page) }
          : { status: 422, body: { ok: false, reason: "invalid_cursor" } },
    });
    const outcome = await service.listArtists("stale");
    expect(http.requests).toHaveLength(2);
    expect(http.requests[1]?.url).not.toContain("cursor");
    expect(outcome.kind === "success" && outcome.data.items).toEqual([withPhoto]);
    expect(outcome.kind === "success" && outcome.data.restartedFromFirstPage).toBe(true);
  });

  it("fails with a timeout outcome when the API does not answer", async () => {
    vi.useFakeTimers();
    const { service } = setup({ list: never });
    const pending = service.listArtists(null);
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS + 1);
    expect(await pending).toEqual({ kind: "transport_failure", cause: "timeout" });
  });

  it("fails with a network outcome when the port throws", async () => {
    const { service } = setup({ list: () => Promise.reject(new Error("offline")) });
    expect(await service.listArtists(null)).toEqual({
      kind: "transport_failure",
      cause: "network",
    });
  });

  it("fails with a schema outcome when an item has no name", async () => {
    const page = { limit: 50, next_cursor: null, has_more: false, total: 1 };
    const { service } = setup({
      list: () => ({ body: pageBody([{ id: "UC1", thumbnail_url: null, image: null }], page) }),
    });
    expect(await service.listArtists(null)).toEqual({
      kind: "transport_failure",
      cause: "schema",
    });
  });
});

describe("similar", () => {
  it("posts artist_id and exclude_ids and returns the similar artists with their image tiers", async () => {
    const { service, http } = setup({
      similar: () => ({
        headers: { "cache-control": "private, no-cache" },
        body: { ok: true, data: { artists: [withPhoto, withoutPhoto] } },
      }),
    });
    expect(await service.similar("UC9", ["UC1", "UC2"])).toEqual({
      kind: "success",
      data: { artists: [withPhoto, withoutPhoto] },
      maxAgeSeconds: 0,
    });
    expect(http.requests[0]?.method).toBe("POST");
    expect(http.requests[0]?.url).toBe("test://api/onboarding/similar");
    expect(JSON.parse(http.requests[0]?.body ?? "null")).toEqual({
      artist_id: "UC9",
      exclude_ids: ["UC1", "UC2"],
    });
  });

  it("returns artists [] as a success (none available is never a 404)", async () => {
    const { service } = setup({ similar: () => ({ body: { ok: true, data: { artists: [] } } }) });
    const outcome = await service.similar("UC9", []);
    expect(outcome.kind).toBe("success");
    expect(outcome.kind === "success" && outcome.data.artists).toEqual([]);
  });

  it("surfaces upstream_error as an api failure", async () => {
    const { service } = setup({
      similar: () => ({ status: 502, body: { ok: false, reason: "upstream_error" } }),
    });
    expect(await service.similar("UC9", [])).toEqual({
      kind: "api_failure",
      reason: "upstream_error",
    });
  });

  it("fails with a timeout outcome when the API does not answer", async () => {
    vi.useFakeTimers();
    const { service } = setup({ similar: never });
    const pending = service.similar("UC9", []);
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS + 1);
    expect(await pending).toEqual({ kind: "transport_failure", cause: "timeout" });
  });

  it("fails with a network outcome when the port throws", async () => {
    const { service } = setup({ similar: () => Promise.reject(new Error("offline")) });
    expect(await service.similar("UC9", [])).toEqual({
      kind: "transport_failure",
      cause: "network",
    });
  });

  it("fails with a schema outcome when an artist has no name", async () => {
    const { service } = setup({
      similar: () => ({
        body: { ok: true, data: { artists: [{ id: "UC1", thumbnail_url: null, image: null }] } },
      }),
    });
    expect(await service.similar("UC9", [])).toEqual({
      kind: "transport_failure",
      cause: "schema",
    });
  });
});

describe("complete", () => {
  it("posts the picked ids as artist_ids and returns the completion with saved and skipped", async () => {
    const { service, http } = setup({
      complete: () => ({
        headers: { "cache-control": "private, no-cache" },
        body: { ok: true, data: completion },
      }),
    });
    const ids = ["UC1", "UC2", "UC3", "UC4", "UC5"];
    expect(await service.complete(ids)).toEqual({
      kind: "success",
      data: completion,
      maxAgeSeconds: 0,
    });
    expect(http.requests[0]?.method).toBe("POST");
    expect(http.requests[0]?.url).toBe("test://api/onboarding/complete");
    expect(JSON.parse(http.requests[0]?.body ?? "null")).toEqual({ artist_ids: ids });
  });

  it("returns a completion with no skipped ids (skipped []) as a success", async () => {
    const clean = { ...completion, skipped: [] };
    const { service } = setup({ complete: () => ({ body: { ok: true, data: clean } }) });
    const outcome = await service.complete(["UC1"]);
    expect(outcome.kind === "success" && outcome.data.skipped).toEqual([]);
  });

  it("surfaces too_few_artists as an api failure", async () => {
    const { service } = setup({
      complete: () => ({ status: 422, body: { ok: false, reason: "too_few_artists" } }),
    });
    expect(await service.complete(["UC1"])).toEqual({
      kind: "api_failure",
      reason: "too_few_artists",
    });
  });

  it("fails with a timeout outcome when the API does not answer", async () => {
    vi.useFakeTimers();
    const { service } = setup({ complete: never });
    const pending = service.complete(["UC1"]);
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS + 1);
    expect(await pending).toEqual({ kind: "transport_failure", cause: "timeout" });
  });

  it("fails with a network outcome when the port throws", async () => {
    const { service } = setup({ complete: () => Promise.reject(new Error("offline")) });
    expect(await service.complete(["UC1"])).toEqual({
      kind: "transport_failure",
      cause: "network",
    });
  });

  it("fails with a schema outcome when the completion has no onboarding_completed_at", async () => {
    const { service } = setup({
      complete: () => ({ body: { ok: true, data: { saved: 5, skipped: [] } } }),
    });
    expect(await service.complete(["UC1"])).toEqual({
      kind: "transport_failure",
      cause: "schema",
    });
  });
});

describe("finish", () => {
  it("calls complete, then generate, and returns complete's data", async () => {
    const { service, http } = setup({
      complete: () => ({ body: { ok: true, data: completion } }),
      generate: () => ({ body: { ok: true, data: noRecommendations } }),
    });
    const outcome = await service.finish(["UC1", "UC2"]);
    expect(outcome.kind === "success" && outcome.data).toEqual(completion);
    expect(routes(http.requests)).toEqual([
      "POST /onboarding/complete",
      "POST /recommendations/generate",
    ]);
  });

  it("succeeds when generate returns the empty set (no artists, no albums, null timestamps)", async () => {
    const { service } = setup({
      complete: () => ({ body: { ok: true, data: completion } }),
      generate: () => ({ body: { ok: true, data: noRecommendations } }),
    });
    expect((await service.finish(["UC1"])).kind).toBe("success");
  });

  it("returns too_few_artists from complete and never calls generate", async () => {
    const { service, http } = setup({
      complete: () => ({ status: 422, body: { ok: false, reason: "too_few_artists" } }),
    });
    expect(await service.finish(["UC1"])).toEqual({
      kind: "api_failure",
      reason: "too_few_artists",
    });
    expect(routes(http.requests)).toEqual(["POST /onboarding/complete"]);
  });

  it("returns generate's upstream_error when complete succeeded", async () => {
    const { service } = setup({
      complete: () => ({ body: { ok: true, data: completion } }),
      generate: () => ({ status: 502, body: { ok: false, reason: "upstream_error" } }),
    });
    expect(await service.finish(["UC1"])).toEqual({
      kind: "api_failure",
      reason: "upstream_error",
    });
  });

  it("returns a timeout from generate after complete succeeded", async () => {
    vi.useFakeTimers();
    const { service } = setup({
      complete: () => ({ body: { ok: true, data: completion } }),
      generate: never,
    });
    const pending = service.finish(["UC1"]);
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS + 1);
    expect(await pending).toEqual({ kind: "transport_failure", cause: "timeout" });
  });

  it("returns a schema failure from complete without calling generate", async () => {
    const { service, http } = setup({
      complete: () => ({ body: { ok: true, data: { saved: 5 } } }),
    });
    expect(await service.finish(["UC1"])).toEqual({
      kind: "transport_failure",
      cause: "schema",
    });
    expect(routes(http.requests)).toEqual(["POST /onboarding/complete"]);
  });
});

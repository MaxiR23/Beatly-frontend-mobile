// packages/core/test/services/recommendations.test.ts
//
// Tests for the recommendations service.
//
// Tested:
// - createRecommendationsService().generate
//
// What is covered:
// - with data (artists and albums with their similar_to reason and seed), the expected empty set, and the three transport failures
// - Not applicable: ok:false, because the screen branches on no reason of this route (the failure passing through is covered in onboarding finish)
//
// Run with: pnpm --filter @beatly/core test -- recommendations
//
// SEE: packages/core/src/services/recommendations.ts

import { afterEach, describe, expect, it, vi } from "vitest";

import { createHttpClient, DEFAULT_TIMEOUT_MS } from "../../src/http/client.ts";
import { createRecommendationsService } from "../../src/services/recommendations.ts";
import { createFakeAuth } from "../fakes/auth.ts";
import { createFakeHttp, never, type Handler } from "../fakes/http.ts";
import { tiers } from "../fakes/images.ts";
import { createFakeLog } from "../fakes/log.ts";

const BASE_URL = "test://api";

const artistSeed = {
  type: "artist",
  id: "UCseed",
  name: "Seed Artist",
  thumbnail_url: "test://img/seed",
  image: tiers("seed"),
};
const albumSeed = { ...artistSeed, type: "album", id: "MPREseed", name: "Seed Album" };
const recommendations = {
  artists: [
    {
      id: "UCrec",
      name: "Recommended",
      thumbnail_url: null,
      image: null,
      reason: { type: "similar_to", seed: artistSeed },
    },
  ],
  albums: [
    {
      id: "MPREalb",
      title: "Recommended Album",
      artists: [{ id: "UCrec", name: "Recommended" }],
      year: "2024",
      audio_playlist_id: "OLAK5",
      thumbnail_url: "test://img/alb",
      image: tiers("alb"),
      reason: { type: "similar_to", seed: albumSeed },
    },
  ],
  generated_at: "2026-10-30T12:00:00+00:00",
  valid_until: "2026-11-06T12:00:00+00:00",
};

function setup(handler: Handler) {
  const http = createFakeHttp({ "POST /recommendations/generate": handler }, BASE_URL);
  const client = createHttpClient({
    http: http.port,
    auth: createFakeAuth().port,
    log: createFakeLog().port,
    baseUrl: BASE_URL,
  });
  return { service: createRecommendationsService(client), http };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("generate", () => {
  it("returns the generated artists and albums with their similar_to reason and seed, and both timestamps", async () => {
    const { service, http } = setup(() => ({
      headers: { "cache-control": "private, no-cache" },
      body: { ok: true, data: recommendations },
    }));
    expect(await service.generate()).toEqual({
      kind: "success",
      data: recommendations,
      maxAgeSeconds: 0,
    });
    expect(http.requests).toHaveLength(1);
    expect(http.requests[0]?.method).toBe("POST");
    expect(http.requests[0]?.url).toBe("test://api/recommendations/generate");
    expect(http.requests[0]?.body).toBeUndefined();
  });

  it("returns artists [], albums [] and null timestamps as a success", async () => {
    const empty = { artists: [], albums: [], generated_at: null, valid_until: null };
    const { service } = setup(() => ({ body: { ok: true, data: empty } }));
    expect(await service.generate()).toEqual({ kind: "success", data: empty, maxAgeSeconds: 0 });
  });

  it("fails with a timeout outcome when the API does not answer", async () => {
    vi.useFakeTimers();
    const { service } = setup(never);
    const pending = service.generate();
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS + 1);
    expect(await pending).toEqual({ kind: "transport_failure", cause: "timeout" });
  });

  it("fails with a network outcome when the request cannot be sent", async () => {
    const { service } = setup(() => Promise.reject(new Error("offline")));
    expect(await service.generate()).toEqual({ kind: "transport_failure", cause: "network" });
  });

  it("fails with a schema outcome when a reason is not similar_to", async () => {
    const broken = {
      ...recommendations,
      artists: [
        {
          ...recommendations.artists[0],
          reason: { type: "popular", seed: artistSeed },
        },
      ],
    };
    const { service } = setup(() => ({ body: { ok: true, data: broken } }));
    expect(await service.generate()).toEqual({ kind: "transport_failure", cause: "schema" });
  });
});

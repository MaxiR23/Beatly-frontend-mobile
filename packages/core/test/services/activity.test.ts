// packages/core/test/services/activity.test.ts
//
// Tests for the activity service.
//
// Tested:
// - listRecents returns the caller's recent entities with their metadata
// - listRecents reads a playlist recent's kind, and an unknown kind as absent
// - Returns an empty first page as a success when there is no recent activity
// - Surfaces unauthorized as an api failure
// - Fails with a timeout, network or schema outcome
//
// What is covered:
// - Happy path, expected empty state, api failure, transport failure
//
// Run with: pnpm --filter @beatly/core test -- activity
//
// SEE: packages/core/src/services/activity.ts

import { afterEach, describe, expect, it, vi } from "vitest";

import { createHttpClient, DEFAULT_TIMEOUT_MS } from "../../src/http/client.ts";
import { createActivityService } from "../../src/services/activity.ts";
import { createFakeAuth } from "../fakes/auth.ts";
import { createFakeHttp, never, type Handler } from "../fakes/http.ts";
import { createFakeLog } from "../fakes/log.ts";

const BASE_URL = "test://api";
const PAGE = { limit: 30, next_cursor: null, has_more: false, total: 2 };

function setup(handler: Handler) {
  const http = createFakeHttp({ "GET /recents": handler }, BASE_URL);
  const client = createHttpClient({
    http: http.port,
    auth: createFakeAuth().port,
    log: createFakeLog().port,
    baseUrl: BASE_URL,
  });
  return { service: createActivityService(client), http };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("listRecents", () => {
  it("returns the caller's recent entities with their metadata", async () => {
    const { service, http } = setup(() => ({
      headers: { "cache-control": "private, no-cache" },
      body: {
        ok: true,
        data: {
          items: [
            {
              entity_type: "album",
              entity_id: "a1",
              played_at: "2026-01-01T00:00:00Z",
              metadata: {
                title: "Album",
                subtitle: "Artist",
                thumbnail_url: "test://img/1",
                extra: "dropped",
              },
            },
            {
              entity_type: "artist",
              entity_id: "r1",
              played_at: "2026-01-02T00:00:00Z",
              metadata: {},
            },
            {
              entity_type: "playlist",
              entity_id: "pl1",
              played_at: "2026-01-03T00:00:00Z",
              metadata: { title: "A playlist", kind: "genre" },
            },
          ],
          page: PAGE,
        },
      },
    }));
    expect(await service.listRecents()).toEqual({
      kind: "success",
      maxAgeSeconds: 0,
      data: {
        items: [
          {
            entity_type: "album",
            entity_id: "a1",
            played_at: "2026-01-01T00:00:00Z",
            metadata: { title: "Album", subtitle: "Artist", thumbnail_url: "test://img/1" },
          },
          {
            entity_type: "artist",
            entity_id: "r1",
            played_at: "2026-01-02T00:00:00Z",
            metadata: {},
          },
          {
            entity_type: "playlist",
            entity_id: "pl1",
            played_at: "2026-01-03T00:00:00Z",
            metadata: { title: "A playlist", kind: "genre" },
          },
        ],
        page: PAGE,
        restartedFromFirstPage: false,
      },
    });
    expect(http.requests[0]?.url).toBe("test://api/recents");
  });

  it("returns an empty first page as a success when the caller has no recent activity", async () => {
    const page = { limit: 30, next_cursor: null, has_more: false, total: 0 };
    const { service } = setup(() => ({ body: { ok: true, data: { items: [], page } } }));
    const outcome = await service.listRecents();
    expect(outcome.kind).toBe("success");
    expect(outcome.kind === "success" && outcome.data.items).toEqual([]);
    expect(outcome.kind === "success" && outcome.data.page.total).toBe(0);
  });

  it("surfaces unauthorized as an api failure", async () => {
    const { service } = setup(() => ({
      status: 401,
      body: { ok: false, reason: "unauthorized" },
    }));
    expect(await service.listRecents()).toEqual({ kind: "api_failure", reason: "unauthorized" });
  });

  it("reads a metadata value that is not a string as absent", async () => {
    const { service } = setup(() => ({
      body: {
        ok: true,
        data: {
          items: [
            {
              entity_type: "album",
              entity_id: "a1",
              played_at: "2026-01-01T00:00:00Z",
              metadata: { title: 5, subtitle: ["A"], thumbnail_url: "test://img/1" },
            },
          ],
          page: PAGE,
        },
      },
    }));
    const outcome = await service.listRecents();
    expect(outcome.kind).toBe("success");
    const metadata = outcome.kind === "success" ? outcome.data.items[0]?.metadata : undefined;
    expect(metadata?.title).toBeUndefined();
    expect(metadata?.subtitle).toBeUndefined();
    expect(metadata?.thumbnail_url).toBe("test://img/1");
  });

  it("reads a playlist recent with an unknown kind as having none", async () => {
    const { service } = setup(() => ({
      body: {
        ok: true,
        data: {
          items: [
            {
              entity_type: "playlist",
              entity_id: "pl1",
              played_at: "2026-01-01T00:00:00Z",
              metadata: { title: "A playlist", kind: "mix" },
            },
          ],
          page: PAGE,
        },
      },
    }));
    const outcome = await service.listRecents();
    expect(outcome.kind).toBe("success");
    const metadata = outcome.kind === "success" ? outcome.data.items[0]?.metadata : undefined;
    expect(metadata?.kind).toBeUndefined();
    expect(metadata?.title).toBe("A playlist");
  });

  it("fails with a timeout outcome when the API does not answer", async () => {
    vi.useFakeTimers();
    const { service } = setup(never);
    const pending = service.listRecents();
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS + 1);
    expect(await pending).toEqual({ kind: "transport_failure", cause: "timeout" });
  });

  it("fails with a network outcome when the request cannot be sent", async () => {
    const { service } = setup(() => Promise.reject(new Error("offline")));
    expect(await service.listRecents()).toEqual({ kind: "transport_failure", cause: "network" });
  });

  it("fails with a schema outcome for an unknown entity_type", async () => {
    const { service } = setup(() => ({
      body: {
        ok: true,
        data: {
          items: [
            {
              entity_type: "track",
              entity_id: "t1",
              played_at: "2026-01-01T00:00:00Z",
              metadata: {},
            },
          ],
          page: PAGE,
        },
      },
    }));
    expect(await service.listRecents()).toEqual({ kind: "transport_failure", cause: "schema" });
  });
});

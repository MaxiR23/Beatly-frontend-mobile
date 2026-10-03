// packages/core/test/services/likes.test.ts
//
// Tests for the likes service.
//
// Tested:
// - sync fills the mirror from every page of GET /likes the first time, and later brings only the changes from GET /likes/sync since the newest update minus 60 seconds
// - sync leaves the mirror empty when there are no likes and changes nothing when nothing changed
// - sync restarts from since when a cursor is rejected, returns unauthorized and keeps the watermark
// - sync fails with a timeout, network or schema outcome and keeps the mirror
// - setLiked marks the like at once and confirms it with POST /likes; an unlike is confirmed with DELETE /likes/{track_id} on data null
// - a transient failure retries with growing waits and confirms; exhausted retries keep the like pending and the next sync sends it; a network failure and a timeout stay pending
// - a rejected like or unlike reverts and returns the reason
// - a like and an unlike in a row send one request; a change during a request is sent after it; the same state sends nothing
// - a pending row is not overwritten by a synced one, nor a newer row by an older one; a row with deleted_at is stored as not liked
// - the mirror answers without network, clear empties it and the watermark, and a sync in flight does not refill it
// - a database failure and a migration failure return a storage failure
//
// What is covered:
// - Happy path, expected empty state (sync; DELETE's null data), api failure, transport failure, against real SQLite (node:sqlite, in memory)
// - Not applicable: isLiked, subscribe, onConfirmed call no API and have no empty state; they are covered through the tests above
//
// Run with: pnpm --filter @beatly/core test -- likes
//
// SEE: packages/core/src/services/likes.ts

import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { migrate, type MigrateOutcome } from "../../src/db/migrations.ts";
import { createHttpClient, DEFAULT_TIMEOUT_MS } from "../../src/http/client.ts";
import {
  createLikesService,
  LIKE_RETRY_DELAYS_MS,
  LIKE_SEND_DELAY_MS,
  type LikeInput,
} from "../../src/services/likes.ts";
import { createFakeAuth } from "../fakes/auth.ts";
import { createFakeDb, type FakeDb } from "../fakes/db.ts";
import { createFakeHttp, never, type FakeResponse, type Handler } from "../fakes/http.ts";
import { createFakeLog } from "../fakes/log.ts";

const BASE_URL = "test://api";

const track: LikeInput = {
  track_id: "t1",
  title: "Song t1",
  artists: [{ id: "ar1", name: "Artist" }],
  album: "Album",
  album_id: "al1",
  thumbnail_url: "test://img/t1",
  duration_seconds: 248,
};

const likeData = (id: string, patch: Record<string, unknown> = {}) => ({
  track_id: id,
  title: `Song ${id}`,
  artists: [{ id: "ar1", name: "Artist" }],
  album: "Album",
  album_id: "al1",
  thumbnail_url: `test://img/${id}`,
  duration_seconds: 248,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:05:00.123456+00:00",
  deleted_at: null,
  ...patch,
});

const ok = (data: unknown): FakeResponse => ({
  headers: { "cache-control": "private, no-cache" },
  body: { ok: true, data },
});
const page = (items: unknown[], extra: Record<string, unknown> = {}): FakeResponse =>
  ok({
    items,
    page: { limit: 100, next_cursor: null, has_more: false, total: items.length, ...extra },
  });
const fail = (status: number, reason: string): FakeResponse => ({
  status,
  body: { ok: false, reason },
});

type Handlers = Partial<
  Record<"GET /likes" | "GET /likes/sync" | "POST /likes" | "DELETE /likes/t1", Handler>
>;

function build(db: FakeDb, handlers: Handlers = {}, migrated?: Promise<MigrateOutcome>) {
  const log = createFakeLog();
  const http = createFakeHttp(
    {
      "GET /likes": never,
      "GET /likes/sync": never,
      "POST /likes": never,
      "DELETE /likes/t1": never,
      ...handlers,
    },
    BASE_URL,
  );
  const client = createHttpClient({
    http: http.port,
    auth: createFakeAuth().port,
    log: log.port,
    baseUrl: BASE_URL,
  });
  const service = createLikesService({
    client,
    db: db.port,
    log: log.port,
    migrated: migrated ?? Promise.resolve({ kind: "success" }),
  });
  return { service, http, log };
}

async function setup(handlers: Handlers = {}) {
  const db = createFakeDb();
  await migrate(db.port, createFakeLog().port);
  return { db, ...build(db, handlers) };
}

const tick = (ms: number) => vi.advanceTimersByTimeAsync(ms);
const storedRow = z.object({
  track_id: z.string(),
  liked: z.number(),
  pending: z.number(),
  updated_at: z.string().nullable(),
  confirmed_liked: z.number().nullable(),
});
const rows = (db: FakeDb) =>
  z.array(storedRow).parse(db.raw.prepare("SELECT * FROM likes ORDER BY track_id").all());
const watermark = (db: FakeDb) =>
  z
    .array(z.object({ since: z.string() }))
    .parse(db.raw.prepare("SELECT since FROM sync_state WHERE name = 'likes'").all())[0]?.since;
const paths = (http: ReturnType<typeof build>["http"]) =>
  http.requests.map((request) => `${request.method} ${request.url.slice(BASE_URL.length)}`);

function seed(db: FakeDb, id: string, patch: Record<string, number | string | null> = {}) {
  const row = {
    liked: 1,
    pending: 0,
    updated_at: "2026-01-01T00:05:00.123456+00:00",
    confirmed_liked: 1,
    ...patch,
  };
  db.raw
    .prepare(
      `INSERT INTO likes (track_id, title, artists, album, album_id, thumbnail_url,
        duration_seconds, liked, updated_at, pending, confirmed_liked)
       VALUES (?, ?, ?, 'Album', 'al1', ?, 248, ?, ?, ?, ?)`,
    )
    .run(
      id,
      `Song ${id}`,
      JSON.stringify([{ id: "ar1", name: "Artist" }]),
      `test://img/${id}`,
      row.liked,
      row.updated_at,
      row.pending,
      row.confirmed_liked,
    );
}

afterEach(() => {
  vi.useRealTimers();
});

describe("sync", () => {
  it("fills the mirror from every page of GET /likes the first time", async () => {
    const { service, db, http } = await setup({
      "GET /likes": (req) =>
        req.query.cursor === "c1"
          ? page([likeData("t2", { updated_at: "2026-01-03T00:00:00.5+00:00" })])
          : page([likeData("t1")], { next_cursor: "c1", has_more: true, total: 2 }),
    });
    expect(service.isLiked("t1")).toBe(false);
    expect(await service.sync()).toEqual({ kind: "success" });
    expect(paths(http)).toEqual(["GET /likes", "GET /likes?cursor=c1"]);
    expect(rows(db).map((row) => [row.track_id, row.liked, row.pending])).toEqual([
      ["t1", 1, 0],
      ["t2", 1, 0],
    ]);
    expect(service.isLiked("t1")).toBe(true);
    expect(service.isLiked("t2")).toBe(true);
    expect(watermark(db)).toBe("1970-01-01T00:00:00Z");
  });

  it("brings only the changes from GET /likes/sync since the newest update minus 60 seconds", async () => {
    const { service, db, http } = await setup({
      "GET /likes/sync": () =>
        page([likeData("t1", { updated_at: "2026-01-01T00:20:00+00:00", deleted_at: "x" })]),
    });
    seed(db, "t1");
    seed(db, "t2");
    db.raw
      .prepare("INSERT INTO sync_state (name, since) VALUES ('likes', ?)")
      .run("2026-01-01T00:10:00.123456+00:00");
    expect(await service.sync()).toEqual({ kind: "success" });
    expect(http.requests).toHaveLength(1);
    expect(http.requests[0]?.url).toBe(
      `${BASE_URL}/likes/sync?since=${encodeURIComponent("2026-01-01T00:09:00.123Z")}`,
    );
    expect(service.isLiked("t1")).toBe(false);
    expect(service.isLiked("t2")).toBe(true);
    expect(watermark(db)).toBe("2026-01-01T00:20:00+00:00");
  });

  it("leaves the mirror empty and succeeds when the caller has no likes", async () => {
    const { service, db } = await setup({ "GET /likes": () => page([]) });
    expect(await service.sync()).toEqual({ kind: "success" });
    expect(rows(db)).toEqual([]);
    expect(watermark(db)).toBe("1970-01-01T00:00:00Z");
    expect(service.isLiked("t1")).toBe(false);
  });

  it("asks /likes/sync after an empty first read and a confirmed like, so an unlike elsewhere arrives", async () => {
    vi.useFakeTimers();
    const { service, db, http } = await setup({
      "GET /likes": () => page([]),
      "POST /likes": () => ok(likeData("t1", { updated_at: "2026-02-01T00:00:00+00:00" })),
      "GET /likes/sync": () =>
        page([likeData("t1", { updated_at: "2026-03-01T00:00:00+00:00", deleted_at: "x" })]),
    });
    await service.sync();
    const liking = service.setLiked(track, true);
    await tick(LIKE_SEND_DELAY_MS);
    await liking;
    expect(service.isLiked("t1")).toBe(true);
    const syncing = service.sync();
    await tick(0);
    expect(await syncing).toEqual({ kind: "success" });
    expect(paths(http).filter((path) => path.startsWith("GET"))).toEqual([
      "GET /likes",
      `GET /likes/sync?since=${encodeURIComponent("1969-12-31T23:59:00.000Z")}`,
    ]);
    expect(service.isLiked("t1")).toBe(false);
    expect(watermark(db)).toBe("2026-03-01T00:00:00+00:00");
  });

  it("does not let a full read of another track hide an earlier unlike", async () => {
    const { service, db, http } = await setup({
      "GET /likes": () => page([likeData("t2", { updated_at: "2026-05-01T00:00:00+00:00" })]),
      "GET /likes/sync": () =>
        page([likeData("t1", { updated_at: "2026-01-02T00:00:00+00:00", deleted_at: "x" })]),
    });
    seed(db, "t1", { updated_at: "2026-01-01T00:00:00+00:00" });
    await service.sync();
    await service.sync();
    expect(paths(http)[1]).toContain("GET /likes/sync?since=");
    expect(service.isLiked("t1")).toBe(false);
    expect(service.isLiked("t2")).toBe(true);
  });

  it("succeeds and changes nothing when nothing changed since the last sync", async () => {
    const { service, db } = await setup({ "GET /likes/sync": () => page([]) });
    seed(db, "t1");
    db.raw
      .prepare("INSERT INTO sync_state (name, since) VALUES ('likes', ?)")
      .run("2026-01-01T00:10:00Z");
    expect(await service.sync()).toEqual({ kind: "success" });
    expect(watermark(db)).toBe("2026-01-01T00:10:00Z");
    expect(rows(db)).toHaveLength(1);
    expect(service.isLiked("t1")).toBe(true);
  });

  it("restarts the sweep from since when a cursor is rejected", async () => {
    let calls = 0;
    const { service, db, http } = await setup({
      "GET /likes/sync": () => {
        calls += 1;
        if (calls === 1) return page([likeData("t1")], { next_cursor: "stale", has_more: true });
        if (calls === 2) return fail(422, "invalid_cursor");
        return page([likeData("t1")]);
      },
    });
    db.raw
      .prepare("INSERT INTO sync_state (name, since) VALUES ('likes', ?)")
      .run("2026-01-01T00:00:00Z");
    expect(await service.sync()).toEqual({ kind: "success" });
    expect(http.requests).toHaveLength(3);
    const last = http.requests[2]?.url ?? "";
    expect(last).toContain("since=");
    expect(last).not.toContain("cursor");
    expect(service.isLiked("t1")).toBe(true);
  });

  it("returns unauthorized as an api failure and keeps the watermark", async () => {
    const { service, db, log } = await setup({
      "GET /likes/sync": () => fail(401, "unauthorized"),
    });
    db.raw
      .prepare("INSERT INTO sync_state (name, since) VALUES ('likes', ?)")
      .run("2026-01-01T00:00:00Z");
    expect(await service.sync()).toEqual({ kind: "api_failure", reason: "unauthorized" });
    expect(watermark(db)).toBe("2026-01-01T00:00:00Z");
    expect(log.entries).toContainEqual({
      level: "warn",
      message: "likes.sync_failed",
      fields: { kind: "api_failure", detail: "unauthorized" },
    });
  });

  it("returns a timeout outcome and keeps the mirror when the API does not answer", async () => {
    vi.useFakeTimers();
    const { service, db } = await setup();
    seed(db, "t1");
    const syncing = service.sync();
    await tick(DEFAULT_TIMEOUT_MS + 1);
    expect(await syncing).toEqual({ kind: "transport_failure", cause: "timeout" });
    expect(rows(db)).toHaveLength(1);
    expect(service.isLiked("t1")).toBe(true);
  });

  it("returns a network outcome", async () => {
    const { service } = await setup({ "GET /likes": () => Promise.reject(new Error("offline")) });
    expect(await service.sync()).toEqual({ kind: "transport_failure", cause: "network" });
  });

  it("returns a schema outcome for a like without track_id", async () => {
    const { service, db } = await setup({
      "GET /likes": () => page([{ title: "No id" }]),
    });
    expect(await service.sync()).toEqual({ kind: "transport_failure", cause: "schema" });
    expect(rows(db)).toEqual([]);
  });

  it("stores a row with deleted_at as not liked", async () => {
    const { service, db } = await setup({
      "GET /likes": () => page([likeData("t1", { deleted_at: "2026-01-02T00:00:00Z" })]),
    });
    await service.sync();
    expect(rows(db).map((row) => [row.liked, row.confirmed_liked])).toEqual([[0, 0]]);
    expect(service.isLiked("t1")).toBe(false);
  });

  it("does not overwrite a newer row with an older one", async () => {
    const { service, db } = await setup({
      "GET /likes": () =>
        page([likeData("t1", { updated_at: "2026-01-01T00:00:00Z", deleted_at: "x" })]),
    });
    seed(db, "t1", { updated_at: "2026-01-02T00:00:00Z" });
    await service.sync();
    expect(rows(db).map((row) => row.liked)).toEqual([1]);
    expect(service.isLiked("t1")).toBe(true);
  });

  it("does not overwrite a pending row with a synced one", async () => {
    vi.useFakeTimers();
    const { service, db } = await setup({
      "POST /likes": () => fail(502, "upstream_error"),
      "GET /likes": () => page([likeData("t1", { deleted_at: "2026-01-02T00:00:00Z" })]),
    });
    seed(db, "t1", { pending: 1, updated_at: null, confirmed_liked: null });
    const syncing = service.sync();
    await tick(LIKE_RETRY_DELAYS_MS.reduce((sum, wait) => sum + wait, 0) + 1);
    expect(await syncing).toEqual({ kind: "success" });
    expect(rows(db).map((row) => [row.liked, row.pending])).toEqual([[1, 1]]);
    expect(service.isLiked("t1")).toBe(true);
  });

  it("answers from the mirror without network", async () => {
    const { service, db } = await setup({ "GET /likes": () => page([likeData("t1")]) });
    await service.sync();
    const offline = build(db, {
      "GET /likes/sync": () => Promise.reject(new Error("offline")),
    });
    expect(offline.service.isLiked("t1")).toBe(false);
    expect(await offline.service.sync()).toEqual({ kind: "transport_failure", cause: "network" });
    expect(offline.service.isLiked("t1")).toBe(true);
  });
});

describe("setLiked", () => {
  it("marks the like at once and confirms it with POST /likes", async () => {
    vi.useFakeTimers();
    const { service, db, http } = await setup({
      "POST /likes": () => ok(likeData("t1", { updated_at: "2026-02-01T00:00:00+00:00" })),
    });
    const changed = vi.fn();
    const confirmed = vi.fn();
    const stop = service.subscribe(changed);
    service.onConfirmed(confirmed);

    const result = service.setLiked(track, true);
    await tick(0);
    expect(service.isLiked("t1")).toBe(true);
    expect(changed).toHaveBeenCalledTimes(1);
    expect(rows(db).map((row) => [row.liked, row.pending])).toEqual([[1, 1]]);
    expect(http.requests).toHaveLength(0);

    await tick(LIKE_SEND_DELAY_MS);
    expect(await result).toEqual({ kind: "confirmed" });
    expect(http.requests[0]?.method).toBe("POST");
    expect(JSON.parse(http.requests[0]?.body ?? "null")).toEqual(track);
    expect(rows(db).map((row) => [row.pending, row.updated_at, row.confirmed_liked])).toEqual([
      [0, "2026-02-01T00:00:00+00:00", 1],
    ]);
    expect(confirmed).toHaveBeenCalledTimes(1);

    stop();
    await service.clear();
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it("omits duration_seconds from the body when the track has none", async () => {
    vi.useFakeTimers();
    const { service, http } = await setup({ "POST /likes": () => ok(likeData("t1")) });
    const result = service.setLiked({ ...track, duration_seconds: null }, true);
    await tick(LIKE_SEND_DELAY_MS);
    expect(await result).toEqual({ kind: "confirmed" });
    expect(JSON.parse(http.requests[0]?.body ?? "null")).not.toHaveProperty("duration_seconds");
  });

  it("confirms an unlike with DELETE /likes/{track_id} on data null", async () => {
    vi.useFakeTimers();
    const { service, db, http } = await setup({ "DELETE /likes/t1": () => ok(null) });
    seed(db, "t1");
    const result = service.setLiked(track, false);
    await tick(LIKE_SEND_DELAY_MS);
    expect(await result).toEqual({ kind: "confirmed" });
    expect(paths(http)).toEqual(["DELETE /likes/t1"]);
    expect(rows(db).map((row) => [row.liked, row.pending, row.confirmed_liked])).toEqual([
      [0, 0, 0],
    ]);
    expect(service.isLiked("t1")).toBe(false);
  });

  it("retries upstream_error with growing waits and confirms", async () => {
    vi.useFakeTimers();
    let calls = 0;
    const { service, http } = await setup({
      "POST /likes": () => {
        calls += 1;
        return calls < 3 ? fail(502, "upstream_error") : ok(likeData("t1"));
      },
    });
    const result = service.setLiked(track, true);
    await tick(LIKE_SEND_DELAY_MS - 1);
    expect(http.requests).toHaveLength(0);
    await tick(1);
    expect(http.requests).toHaveLength(1);
    await tick((LIKE_RETRY_DELAYS_MS[0] ?? 0) - 1);
    expect(http.requests).toHaveLength(1);
    await tick(1);
    expect(http.requests).toHaveLength(2);
    await tick((LIKE_RETRY_DELAYS_MS[1] ?? 0) - 1);
    expect(http.requests).toHaveLength(2);
    await tick(1);
    expect(http.requests).toHaveLength(3);
    expect(await result).toEqual({ kind: "confirmed" });
  });

  it("keeps the like pending after the retries are exhausted and sends it on the next sync", async () => {
    vi.useFakeTimers();
    let accept = false;
    const { service, db, http, log } = await setup({
      "POST /likes": () => (accept ? ok(likeData("t1")) : fail(504, "upstream_timeout")),
      "GET /likes": () => page([]),
    });
    const result = service.setLiked(track, true);
    await tick(LIKE_SEND_DELAY_MS + LIKE_RETRY_DELAYS_MS.reduce((sum, wait) => sum + wait, 0));
    expect(await result).toEqual({ kind: "pending" });
    expect(http.requests).toHaveLength(1 + LIKE_RETRY_DELAYS_MS.length);
    expect(rows(db).map((row) => [row.liked, row.pending])).toEqual([[1, 1]]);
    expect(service.isLiked("t1")).toBe(true);
    expect(log.entries).toContainEqual({
      level: "warn",
      message: "likes.send_pending",
      fields: { trackId: "t1", detail: "upstream_timeout" },
    });

    accept = true;
    expect(await service.sync()).toEqual({ kind: "success" });
    expect(rows(db).map((row) => [row.liked, row.pending])).toEqual([[1, 0]]);
  });

  it("reverts a rejected like and returns invalid_request", async () => {
    vi.useFakeTimers();
    const { service, db, http } = await setup({
      "POST /likes": () => fail(422, "invalid_request"),
    });
    const changed = vi.fn();
    service.subscribe(changed);
    const result = service.setLiked(track, true);
    await tick(LIKE_SEND_DELAY_MS);
    expect(await result).toEqual({ kind: "rejected", reason: "invalid_request" });
    expect(http.requests).toHaveLength(1);
    expect(rows(db)).toEqual([]);
    expect(service.isLiked("t1")).toBe(false);
    expect(changed).toHaveBeenCalledTimes(2);
  });

  it("reverts a rejected unlike to liked", async () => {
    vi.useFakeTimers();
    const { service, db } = await setup({ "DELETE /likes/t1": () => fail(401, "unauthorized") });
    seed(db, "t1");
    const result = service.setLiked(track, false);
    await tick(LIKE_SEND_DELAY_MS);
    expect(await result).toEqual({ kind: "rejected", reason: "unauthorized" });
    expect(rows(db).map((row) => [row.liked, row.pending])).toEqual([[1, 0]]);
    expect(service.isLiked("t1")).toBe(true);
  });

  it("retries a network failure and stays pending, never dropped", async () => {
    vi.useFakeTimers();
    const { service, db, http } = await setup({
      "POST /likes": () => Promise.reject(new Error("offline")),
    });
    const result = service.setLiked(track, true);
    await tick(LIKE_SEND_DELAY_MS + LIKE_RETRY_DELAYS_MS.reduce((sum, wait) => sum + wait, 0));
    expect(await result).toEqual({ kind: "pending" });
    expect(http.requests).toHaveLength(1 + LIKE_RETRY_DELAYS_MS.length);
    expect(rows(db).map((row) => [row.liked, row.pending])).toEqual([[1, 1]]);
  });

  it("retries a timeout and stays pending, never dropped", async () => {
    vi.useFakeTimers();
    const { service, db, http } = await setup();
    const result = service.setLiked(track, true);
    const attempts = 1 + LIKE_RETRY_DELAYS_MS.length;
    await tick(
      LIKE_SEND_DELAY_MS +
        LIKE_RETRY_DELAYS_MS.reduce((sum, wait) => sum + wait, 0) +
        attempts * (DEFAULT_TIMEOUT_MS + 1),
    );
    expect(await result).toEqual({ kind: "pending" });
    expect(http.requests).toHaveLength(attempts);
    expect(rows(db).map((row) => row.pending)).toEqual([1]);
  });

  it("sends one request for a like and an unlike in a row", async () => {
    vi.useFakeTimers();
    const { service, db, http } = await setup({ "DELETE /likes/t1": () => ok(null) });
    const first = service.setLiked(track, true);
    await tick(0);
    const second = service.setLiked(track, false);
    await tick(LIKE_SEND_DELAY_MS);
    const [a, b] = await Promise.all([first, second]);
    expect(a).toEqual({ kind: "confirmed" });
    expect(b).toEqual(a);
    expect(paths(http)).toEqual(["DELETE /likes/t1"]);
    expect(rows(db).map((row) => [row.liked, row.pending])).toEqual([[0, 0]]);
    expect(service.isLiked("t1")).toBe(false);
  });

  it("sends the latest state again when it changes during a request", async () => {
    vi.useFakeTimers();
    let release: () => void = () => undefined;
    const { service, db, http } = await setup({
      "POST /likes": () =>
        new Promise<FakeResponse>((resolve) => {
          release = () => {
            resolve(ok(likeData("t1")));
          };
        }),
      "DELETE /likes/t1": () => ok(null),
    });
    const first = service.setLiked(track, true);
    await tick(LIKE_SEND_DELAY_MS);
    expect(paths(http)).toEqual(["POST /likes"]);
    const second = service.setLiked(track, false);
    await tick(0);
    release();
    await tick(0);
    expect(await first).toEqual({ kind: "confirmed" });
    expect(await second).toEqual({ kind: "confirmed" });
    expect(paths(http)).toEqual(["POST /likes", "DELETE /likes/t1"]);
    expect(rows(db).map((row) => [row.liked, row.pending])).toEqual([[0, 0]]);
  });

  it("does not send anything when the track already has that state", async () => {
    vi.useFakeTimers();
    const { service, db, http } = await setup();
    seed(db, "t1");
    expect(await service.setLiked(track, true)).toEqual({ kind: "confirmed" });
    await tick(LIKE_SEND_DELAY_MS * 4);
    expect(http.requests).toHaveLength(0);
  });
});

describe("clear", () => {
  it("clears the mirror and the watermark, so the next sync is a full read", async () => {
    const { service, db, http } = await setup({
      "GET /likes": () => page([likeData("t1")]),
      "GET /likes/sync": () => page([]),
    });
    await service.sync();
    const changed = vi.fn();
    service.subscribe(changed);
    expect(await service.clear()).toEqual({ kind: "success" });
    expect(rows(db)).toEqual([]);
    expect(watermark(db)).toBeUndefined();
    expect(service.isLiked("t1")).toBe(false);
    expect(changed).toHaveBeenCalledTimes(1);
    await service.sync();
    expect(paths(http)).toEqual(["GET /likes", "GET /likes"]);
  });

  it("starts a new full read for a sync called after clear while the old one is in flight", async () => {
    let release: () => void = () => undefined;
    let arrive: () => void = () => undefined;
    const arrived = new Promise<void>((resolve) => {
      arrive = resolve;
    });
    let calls = 0;
    const { service, db, http } = await setup({
      "GET /likes": () => {
        calls += 1;
        if (calls > 1) return page([likeData("t2")]);
        arrive();
        return new Promise<FakeResponse>((resolve) => {
          release = () => {
            resolve(page([likeData("t1")]));
          };
        });
      },
    });
    const first = service.sync();
    await arrived;
    await service.clear();
    const second = service.sync();
    expect(second).not.toBe(first);
    expect(await second).toEqual({ kind: "success" });
    release();
    await first;
    expect(paths(http)).toEqual(["GET /likes", "GET /likes"]);
    expect(service.isLiked("t2")).toBe(true);
    expect(service.isLiked("t1")).toBe(false);
    expect(rows(db).map((row) => row.track_id)).toEqual(["t2"]);
  });

  it("does not refill the mirror from a sync in flight during clear", async () => {
    let release: () => void = () => undefined;
    let arrive: () => void = () => undefined;
    const arrived = new Promise<void>((resolve) => {
      arrive = resolve;
    });
    const { service, db } = await setup({
      "GET /likes": () => {
        arrive();
        return new Promise<FakeResponse>((resolve) => {
          release = () => {
            resolve(page([likeData("t1")]));
          };
        });
      },
    });
    const syncing = service.sync();
    await arrived;
    expect(await service.clear()).toEqual({ kind: "success" });
    release();
    await syncing;
    expect(rows(db)).toEqual([]);
    expect(watermark(db)).toBeUndefined();
    expect(service.isLiked("t1")).toBe(false);
  });
});

describe("storage failures", () => {
  it("returns a storage failure and logs it when the database fails", async () => {
    const { service, db, log } = await setup();
    db.fail("run");
    expect(await service.setLiked(track, true)).toEqual({
      kind: "storage_failure",
      cause: "write",
    });
    expect(log.entries).toContainEqual({
      level: "warn",
      message: "likes.db_failure",
      fields: { op: "write", cause: "write" },
    });
  });

  it("returns a storage failure when the database cannot be read", async () => {
    const { service, db } = await setup();
    db.fail("all");
    expect(await service.sync()).toEqual({ kind: "storage_failure", cause: "read" });
  });

  it("returns the migration failure when migrations did not apply", async () => {
    const db = createFakeDb();
    const failed: MigrateOutcome = { kind: "storage_failure", cause: "write" };
    const { service, http } = build(db, {}, Promise.resolve(failed));
    expect(await service.sync()).toEqual(failed);
    expect(await service.setLiked(track, true)).toEqual(failed);
    expect(await service.clear()).toEqual(failed);
    expect(http.requests).toHaveLength(0);
  });
});

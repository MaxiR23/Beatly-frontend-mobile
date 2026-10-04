// INFO: the likes service: a local mirror of the caller's likes in the db port, filled by GET /likes the first time and by GET /likes/sync afterwards, read from memory so it answers without network; a toggle changes the mirror first and is confirmed by POST or DELETE /likes, retried while transient, reverted when rejected, never dropped.
import { z } from "zod";

import type { MigrateOutcome } from "../db/migrations.ts";
import { likeArtistSchema, likeSchema, likesCheckpointSchema, type Like } from "../domain/like.ts";
import type { ApiReason } from "../domain/envelope.ts";
import type { HttpClient } from "../http/client.ts";
import type { ApiFailure, HttpOutcome, TransportFailure } from "../http/outcome.ts";
import { fetchPageWith, type PageResult } from "../http/paginated.ts";
import type { DbExecutor, DbPort, SqlValue } from "../ports/db.ts";
import type { LogPort } from "../ports/log.ts";
import type { PlayArtist } from "./activity.ts";
import type { PlayableTrack } from "./playback.ts";
import type { StorageFailure } from "./recentSearches.ts";

// The settle window: a like and an unlike inside it become one request.
export const LIKE_SEND_DELAY_MS = 500;
// The waits before each retry of a transient failure: three retries, growing.
export const LIKE_RETRY_DELAYS_MS: readonly number[] = [1000, 2000, 4000];

export interface LikeInput {
  readonly track_id: string;
  readonly title: string;
  readonly artists: readonly PlayArtist[];
  readonly album: string;
  readonly album_id: string;
  readonly thumbnail_url: string;
  readonly duration_seconds: number | null;
}

// The body POST /likes requires, or null when the track lacks a field of it; the duration is optional.
export function likeInputOf(track: PlayableTrack): LikeInput | null {
  const artists: PlayArtist[] = [];
  for (const artist of track.artists) {
    if (artist.id !== null) artists.push({ id: artist.id, name: artist.name });
  }
  if (
    track.album === null ||
    track.albumId === null ||
    track.coverUrl === null ||
    artists.length === 0
  ) {
    return null;
  }
  return {
    track_id: track.trackId,
    title: track.title,
    artists,
    album: track.album,
    album_id: track.albumId,
    thumbnail_url: track.coverUrl,
    duration_seconds: track.durationSeconds,
  };
}

export type LikeOutcome =
  | { readonly kind: "confirmed" }
  // Transient failures exhausted: the row stays pending and is sent again on the next sync.
  | { readonly kind: "pending" }
  // The backend refused the write: the mirror went back to what it had accepted.
  | { readonly kind: "rejected"; readonly reason: ApiReason }
  | StorageFailure;

export type LikesSyncOutcome =
  { readonly kind: "success" } | ApiFailure | TransportFailure | StorageFailure;

export interface LikesService {
  // From the in-memory set, so it answers with no network and no wait.
  isLiked(trackId: string): boolean;
  // The local state changed (a toggle, a revert, a sync, a clear).
  subscribe(listener: () => void): () => void;
  // The backend accepted a write.
  onConfirmed(listener: () => void): () => void;
  setLiked(track: LikeInput, liked: boolean): Promise<LikeOutcome>;
  // Loads the mirror, sends what is pending, pulls the changes. Never rejects.
  sync(): Promise<LikesSyncOutcome>;
  // Deletes the rows and the watermark, for sign out. Never rejects.
  clear(): Promise<{ readonly kind: "success" } | StorageFailure>;
}

// The reasons the contract maps to 5xx: worth retrying. Any other reason on a write is a refusal.
const TRANSIENT_REASONS: ReadonlySet<string> = new Set([
  "upstream_error",
  "upstream_timeout",
  "internal_error",
]);

const WATERMARK = "likes";

const rowSchema = z.object({
  track_id: z.string(),
  title: z.string(),
  artists: z.string(),
  album: z.string(),
  album_id: z.string(),
  thumbnail_url: z.string(),
  duration_seconds: z.number().nullable(),
  liked: z.number(),
  pending: z.number(),
  updated_at: z.string().nullable(),
  confirmed_liked: z.number().nullable(),
});

interface Row {
  readonly track_id: string;
  readonly title: string;
  readonly artists: readonly PlayArtist[];
  readonly album: string;
  readonly album_id: string;
  readonly thumbnail_url: string;
  readonly duration_seconds: number | null;
  readonly liked: number;
  readonly pending: number;
  readonly updated_at: string | null;
  readonly confirmed_liked: number | null;
}

class RowSchemaError extends Error {}

type Attempt<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly failure: StorageFailure };

type RouteResult =
  { readonly kind: "success"; readonly updatedAt: string | null } | ApiFailure | TransportFailure;

interface Worker {
  dirty: boolean;
  promise: Promise<LikeOutcome>;
}

const UPSERT_SERVER_ROW = `INSERT INTO likes (track_id, title, artists, album, album_id, thumbnail_url,
  duration_seconds, liked, updated_at, pending, confirmed_liked)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
ON CONFLICT(track_id) DO UPDATE SET
  title = excluded.title, artists = excluded.artists, album = excluded.album,
  album_id = excluded.album_id, thumbnail_url = excluded.thumbnail_url,
  duration_seconds = excluded.duration_seconds, liked = excluded.liked,
  updated_at = excluded.updated_at, confirmed_liked = excluded.liked
WHERE likes.pending = 0
  AND (likes.updated_at IS NULL OR excluded.updated_at >= likes.updated_at)`;

// updated_at is kept: only the backend stamps it.
const UPSERT_LOCAL_ROW = `INSERT INTO likes (track_id, title, artists, album, album_id, thumbnail_url,
  duration_seconds, liked, updated_at, pending, confirmed_liked)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 1, ?)
ON CONFLICT(track_id) DO UPDATE SET
  title = excluded.title, artists = excluded.artists, album = excluded.album,
  album_id = excluded.album_id, thumbnail_url = excluded.thumbnail_url,
  duration_seconds = excluded.duration_seconds, liked = excluded.liked,
  pending = 1, confirmed_liked = excluded.confirmed_liked`;

// Read through a function: another call sets the flag during the awaits, which flow analysis cannot see.
const isDirty = (worker: Worker): boolean => worker.dirty;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function parseRows<T>(schema: z.ZodType<T>, rows: unknown): T {
  const parsed = schema.safeParse(rows);
  if (!parsed.success) throw new RowSchemaError("row does not match its schema");
  return parsed.data;
}

function toRow(raw: unknown): Row {
  const row = parseRows(rowSchema, raw);
  let artists: unknown;
  try {
    artists = JSON.parse(row.artists);
  } catch {
    throw new RowSchemaError("artists is not JSON");
  }
  return { ...row, artists: parseRows(z.array(likeArtistSchema), artists) };
}

async function readRow(executor: DbExecutor, trackId: string): Promise<Row | null> {
  const rows = await executor.all("SELECT * FROM likes WHERE track_id = ?", [trackId]);
  const first = rows[0];
  return first === undefined ? null : toRow(first);
}

export function createLikesService(deps: {
  client: HttpClient;
  db: DbPort;
  log: LogPort;
  migrated: Promise<MigrateOutcome>;
}): LikesService {
  const { client, db, log, migrated } = deps;

  let generation = 0;
  let likedIds = new Set<string>();
  let syncing: Promise<LikesSyncOutcome> | null = null;
  // Ids the backend accepted a write for while a full read runs: that read cannot know them, so its cleanup keeps them.
  let acceptedDuringRead: Set<string> | null = null;
  const workers = new Map<string, Worker>();
  const listeners = new Set<() => void>();
  const confirmedListeners = new Set<() => void>();

  const notify = (set: ReadonlySet<() => void>): void => {
    for (const listener of [...set]) listener();
  };

  // Every db access goes through here: waits for the migrations and types a failure.
  async function attempt<T>(op: "read" | "write", work: () => Promise<T>): Promise<Attempt<T>> {
    const ready = await migrated;
    if (ready.kind !== "success") return { ok: false, failure: ready };
    try {
      return { ok: true, value: await work() };
    } catch (error) {
      const cause = error instanceof RowSchemaError ? "schema" : op;
      log.warn("likes.db_failure", { op, cause });
      return { ok: false, failure: { kind: "storage_failure", cause } };
    }
  }

  function applyIds(next: Set<string>): void {
    const changed = next.size !== likedIds.size || [...next].some((id) => !likedIds.has(id));
    likedIds = next;
    if (changed) notify(listeners);
  }

  // The set is the read model of the table: reloaded after every write that can change it.
  async function refresh(): Promise<Attempt<void>> {
    const read = await attempt("read", async () => {
      const rows = await db.all("SELECT track_id FROM likes WHERE liked = 1");
      return parseRows(z.array(z.object({ track_id: z.string() })), rows);
    });
    if (!read.ok) return read;
    applyIds(new Set(read.value.map((row) => row.track_id)));
    return { ok: true, value: undefined };
  }

  const likeBody = (row: Row) => ({
    track_id: row.track_id,
    title: row.title,
    artists: row.artists,
    album: row.album,
    album_id: row.album_id,
    thumbnail_url: row.thumbnail_url,
    ...(row.duration_seconds !== null ? { duration_seconds: row.duration_seconds } : {}),
  });

  async function callRoute(row: Row): Promise<RouteResult> {
    if (row.liked === 1) {
      const outcome = await client.request({
        method: "POST",
        path: "/likes",
        body: likeBody(row),
        schema: likeSchema,
      });
      return outcome.kind === "success"
        ? { kind: "success", updatedAt: outcome.data.updated_at }
        : outcome;
    }
    const outcome = await client.request({
      method: "DELETE",
      path: `/likes/${encodeURIComponent(row.track_id)}`,
      schema: z.null(),
    });
    return outcome.kind === "success" ? { kind: "success", updatedAt: null } : outcome;
  }

  async function revert(trackId: string): Promise<Attempt<void>> {
    return attempt("write", () =>
      db.transaction(async (tx) => {
        await tx.run("DELETE FROM likes WHERE track_id = ? AND confirmed_liked IS NULL", [trackId]);
        await tx.run(
          "UPDATE likes SET liked = confirmed_liked, pending = 0 WHERE track_id = ? AND confirmed_liked IS NOT NULL",
          [trackId],
        );
      }),
    );
  }

  // Sends the row's current state, retrying a transient failure with growing waits.
  async function deliver(row: Row, gen: number): Promise<LikeOutcome> {
    for (let retry = 0; ; retry += 1) {
      const outcome = await callRoute(row);
      if (gen !== generation) return { kind: "pending" };

      if (outcome.kind === "success") {
        const saved = await attempt("write", () =>
          db.run(
            "UPDATE likes SET pending = 0, confirmed_liked = ?, updated_at = COALESCE(?, updated_at) WHERE track_id = ? AND liked = ?",
            [row.liked, outcome.updatedAt, row.track_id, row.liked],
          ),
        );
        if (!saved.ok) return saved.failure;
        acceptedDuringRead?.add(row.track_id);
        notify(confirmedListeners);
        return { kind: "confirmed" };
      }

      const detail = outcome.kind === "transport_failure" ? outcome.cause : outcome.reason;
      const transient =
        outcome.kind === "transport_failure" || TRANSIENT_REASONS.has(outcome.reason);
      if (transient) {
        const wait = LIKE_RETRY_DELAYS_MS[retry];
        if (wait !== undefined) {
          await sleep(wait);
          if (gen !== generation) return { kind: "pending" };
          continue;
        }
        log.warn("likes.send_pending", { trackId: row.track_id, detail });
        return { kind: "pending" };
      }

      // Rejected: back to the last state the backend accepted.
      const reverted = await revert(row.track_id);
      if (!reverted.ok) return reverted.failure;
      const reloaded = await refresh();
      if (!reloaded.ok) return reloaded.failure;
      log.warn("likes.send_rejected", { trackId: row.track_id, reason: detail });
      // outcome is an api failure here: a transport failure is always transient.
      return { kind: "rejected", reason: detail };
    }
  }

  async function runWorker(trackId: string, delayMs: number, worker: Worker): Promise<LikeOutcome> {
    const gen = generation;
    try {
      if (delayMs > 0) await sleep(delayMs);
      let outcome: LikeOutcome;
      do {
        worker.dirty = false;
        if (gen !== generation) return { kind: "pending" };
        const read = await attempt("read", () => readRow(db, trackId));
        if (!read.ok) return read.failure;
        outcome =
          read.value === null || read.value.pending === 0
            ? { kind: "confirmed" }
            : await deliver(read.value, gen);
        // A toggle during the delivery is sent next, once this one was accepted.
      } while (isDirty(worker) && outcome.kind === "confirmed");
      return outcome;
    } finally {
      if (workers.get(trackId) === worker) workers.delete(trackId);
    }
  }

  // One worker per track: a toggle while one waits or sends joins it and shares its outcome.
  function send(trackId: string, delayMs: number): Promise<LikeOutcome> {
    const existing = workers.get(trackId);
    if (existing !== undefined) {
      existing.dirty = true;
      return existing.promise;
    }
    const worker: Worker = { dirty: false, promise: Promise.resolve({ kind: "confirmed" }) };
    workers.set(trackId, worker);
    worker.promise = runWorker(trackId, delayMs, worker);
    return worker.promise;
  }

  async function upsertPage(items: readonly Like[]): Promise<Attempt<void>> {
    return attempt("write", () =>
      db.transaction(async (tx) => {
        for (const item of items) {
          const liked = item.deleted_at === null ? 1 : 0;
          const params: SqlValue[] = [
            item.track_id,
            item.title,
            JSON.stringify(item.artists),
            item.album,
            item.album_id,
            item.thumbnail_url,
            item.duration_seconds,
            liked,
            item.updated_at,
            liked,
          ];
          await tx.run(UPSERT_SERVER_ROW, params);
        }
      }),
    );
  }

  async function pull(gen: number): Promise<LikesSyncOutcome> {
    const read = await attempt("read", async () => {
      const rows = await db.all("SELECT since FROM sync_state WHERE name = ?", [WATERMARK]);
      return parseRows(z.array(z.object({ since: z.string() })), rows)[0]?.since ?? null;
    });
    if (!read.ok) return read.failure;
    // The server's checkpoint, or the watermark an older version stored, sent as is (likes.md, Checkpoint).
    const since = read.value;

    let cursor: string | null = null;
    // Ids a full read returned; the rows it did not return are swept once the whole read finished.
    let seen = new Set<string>();
    const accepted = new Set<string>();
    acceptedDuringRead = since === null ? accepted : null;

    for (;;) {
      const outcome: HttpOutcome<PageResult<Like> & { readonly checkpoint: string }> =
        await fetchPageWith(
          client,
          {
            path: since === null ? "/likes" : "/likes/sync",
            item: likeSchema,
            cursor,
            ...(since === null ? {} : { query: { since } }),
          },
          likesCheckpointSchema,
        );
      if (outcome.kind !== "success") return outcome;
      // Signed out meanwhile: the previous user's likes must not refill the mirror.
      if (gen !== generation) return { kind: "success" };

      const { items, page }: PageResult<Like> = outcome.data;
      if (since === null) {
        if (outcome.data.restartedFromFirstPage) seen = new Set();
        for (const item of items) seen.add(item.track_id);
      }
      if (items.length > 0) {
        const saved = await upsertPage(items);
        if (!saved.ok) return saved.failure;
      }
      if (page.has_more && page.next_cursor !== null) {
        cursor = page.next_cursor;
        continue;
      }

      // Only a whole read moves the watermark (the server's checkpoint, unchanged) and, for a full
      // read, which never returns an unlike, drops the confirmed rows it did not return; pending rows and writes accepted during the read stay.
      if (gen === generation) {
        const mark = outcome.data.checkpoint;
        const fullRead = since === null;
        const written = await attempt("write", () =>
          db.transaction(async (tx) => {
            if (fullRead) {
              const confirmed = parseRows(
                z.array(z.object({ track_id: z.string() })),
                await tx.all("SELECT track_id FROM likes WHERE pending = 0"),
              );
              for (const row of confirmed) {
                if (!seen.has(row.track_id) && !accepted.has(row.track_id)) {
                  await tx.run("DELETE FROM likes WHERE track_id = ? AND pending = 0", [
                    row.track_id,
                  ]);
                }
              }
            }
            await tx.run(
              "INSERT INTO sync_state (name, since) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET since = excluded.since",
              [WATERMARK, mark],
            );
          }),
        );
        if (!written.ok) return written.failure;
      }
      break;
    }
    const reloaded = await refresh();
    if (!reloaded.ok) return reloaded.failure;
    return { kind: "success" };
  }

  async function runSync(): Promise<LikesSyncOutcome> {
    const gen = generation;
    const loaded = await refresh();
    if (!loaded.ok) return loaded.failure;

    const pendingRows = await attempt("read", async () => {
      const rows = await db.all("SELECT track_id FROM likes WHERE pending = 1");
      return parseRows(z.array(z.object({ track_id: z.string() })), rows);
    });
    if (!pendingRows.ok) return pendingRows.failure;
    await Promise.all(pendingRows.value.map((row) => send(row.track_id, 0)));

    const outcome = await pull(gen);
    if (outcome.kind === "api_failure" || outcome.kind === "transport_failure") {
      log.warn("likes.sync_failed", {
        kind: outcome.kind,
        detail: outcome.kind === "api_failure" ? outcome.reason : outcome.cause,
      });
    }
    return outcome;
  }

  return {
    isLiked: (trackId) => likedIds.has(trackId),

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    onConfirmed(listener) {
      confirmedListeners.add(listener);
      return () => {
        confirmedListeners.delete(listener);
      };
    },

    async setLiked(track, liked) {
      const written = await attempt("write", async () => {
        let unchanged = false;
        await db.transaction(async (tx) => {
          const row = await readRow(tx, track.track_id);
          if (row !== null && row.pending === 0 && (row.liked === 1) === liked) {
            unchanged = true;
            return;
          }
          // What the backend last accepted: kept while pending, the row's state otherwise.
          let confirmed: number | null = null;
          if (row !== null) confirmed = row.pending === 0 ? row.liked : row.confirmed_liked;
          await tx.run(UPSERT_LOCAL_ROW, [
            track.track_id,
            track.title,
            JSON.stringify(track.artists),
            track.album,
            track.album_id,
            track.thumbnail_url,
            track.duration_seconds,
            liked ? 1 : 0,
            confirmed,
          ]);
        });
        return unchanged;
      });
      if (!written.ok) return written.failure;
      if (written.value) return { kind: "confirmed" };
      const reloaded = await refresh();
      // The row stays pending, so the next sync sends it.
      if (!reloaded.ok) return reloaded.failure;
      return send(track.track_id, LIKE_SEND_DELAY_MS);
    },

    sync() {
      if (syncing !== null) return syncing;
      const running: Promise<LikesSyncOutcome> = runSync().finally(() => {
        // Only its own promise: a sync started after clear() must not be erased.
        if (syncing === running) syncing = null;
      });
      syncing = running;
      return running;
    },

    async clear() {
      // Synchronously first: whatever started before this must stop writing.
      generation += 1;
      syncing = null;
      workers.clear();
      const cleared = await attempt("write", () =>
        db.transaction(async (tx) => {
          await tx.run("DELETE FROM likes");
          await tx.run("DELETE FROM sync_state");
        }),
      );
      if (!cleared.ok) return cleared.failure;
      applyIds(new Set());
      return { kind: "success" };
    },
  };
}

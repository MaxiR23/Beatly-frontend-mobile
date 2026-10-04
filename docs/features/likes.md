# Likes mirror

The local copy of the caller's likes, kept in the device database; its screens are the heart of the player and the track menu's Like item (`track-menu.md`).

## Purpose

Answer "is this track liked?" instantly and offline, and keep a like made
without network until the backend confirms it. The heart in the player and the
track menu's Like and Remove from Liked items draw it, and only for a track that carries
what `POST /likes` requires (`likeInputOf`: title, an artist with an id, album, album id and cover).

## Local data

Migration 1 (`packages/core/src/db/migrations.ts`) creates two tables.

- `likes`: `track_id` (key), `title`, `artists` (JSON array of `{id, name}`),
  `album`, `album_id`, `thumbnail_url`, `duration_seconds`, `liked` (0/1),
  `updated_at` (the backend's, null for a row only changed locally), `pending`
  (0/1, not yet confirmed) and `confirmed_liked` (the last state the backend
  accepted, null if it never had the row).
- `sync_state`: `name`, `since`. The `likes` row is the server checkpoint of the
  last completed read.

## Data

| Route                    | Paginated | Use                                                           |
| ------------------------ | --------- | ------------------------------------------------------------- |
| `GET /likes`             | yes       | the first sync, every page                                    |
| `GET /likes/sync?since=` | yes       | later syncs: the changes since the stored checkpoint          |
| `POST /likes`            | no        | confirms a like                                               |
| `DELETE /likes/{id}`     | no        | confirms an unlike (the body is `ok: true` with `data: null`) |

Both list routes return `data.checkpoint` on every page, the empty one included.
All four send `Cache-Control: private, no-cache`; the mirror is the cache, so no
query hook reads a cache time.

The service classifies by outcome, not by status. Transient: any transport
failure and the reasons `upstream_error`, `upstream_timeout`, `internal_error`.
Rejected: any other reason (the routes list `invalid_request` and
`unauthorized`). `invalid_cursor` is handled by the shared paginated helper: the
cursor is dropped and the sweep restarts from `since`. No screen branches on a
reason yet, so none has an i18n key; a rejected write carries its `reason` for
the screen that maps it.

Every read (`GET /likes` or `GET /likes/sync`) returns the server's
`checkpoint`, the same value on every page of the read. When the whole read
finished the mirror stores the last page's checkpoint, even with zero items, and
sends it unchanged as `since` on the next sync (the `+` of the offset goes as
`%2B`). The device computes no sync point and subtracts no overlap: the server
already put the 60 seconds in the checkpoint. A failure in the middle repeats
the read, and a POST response cannot move the checkpoint past changes made on
another device. A watermark stored by an earlier version is sent once as is and
replaced by the first checkpoint. A full read (no stored checkpoint) never
returns an unlike, so once the whole read finished (in the same transaction that
stores the checkpoint) it drops the confirmed rows it did not return and keeps
the pending ones; a read that fails midway changes no row. A like (or unlike) the backend accepted
while the full read was in progress is kept by that cleanup, since the read cannot
know it.
A pending row is never overwritten by a synced one, and an older
version of a row never overwrites a newer one. A row with `deleted_at` is stored
as not liked.

## Toggle

`setLiked` changes the local row first (the answer is immediate and `subscribe`
listeners are told), then waits 500 ms before sending, so a like and an unlike
in a row become one request. The request is retried three times, after 1, 2 and 4
seconds, while the failure is transient; if it still fails the row stays pending
and the next sync sends it. A rejected write reverts the row to the last state
the backend accepted and returns the typed `rejected` outcome. A change made
while a request is in flight is sent after it. When the backend accepts a write
the library and the liked playlist queries are refreshed.

## Lifecycle

`SessionProvider` runs it: a sync at start with a stored session, on sign in and
on every return to the foreground while signed in; on sign out the rows and the
watermark are deleted, and a sweep in flight stops writing.

## States

| State   | What is drawn                                                                                                              | i18n keys                |
| ------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| Liked   | the heart filled (the player), Remove from Liked (the menu)                                                                | `trackMenu:items.unlike` |
| Unliked | the heart outlined, Like                                                                                                   | `trackMenu:items.like`   |
| Failed  | a floating notice for a `rejected` or `storage_failure` outcome; a `pending` one shows nothing, the service sends it again | `common:error.generic`   |

The heart reads `useIsLiked`, which follows the mirror, so it flips at once and is not held by the network; the mirror reverts on a rejection. No screen branches on a `reason`.

## Checked by hand

Needs the real native SQLite engine, the real API and a real app lifecycle:

- The database file is created and migrated on first launch and kept across restarts.
- A like made offline (airplane mode) stays pending and is confirmed after reconnecting and returning to the foreground.
- Signing out and signing in with another account starts with an empty mirror and a full read.
- The sync after the app returns from the background on iOS and Android.
- After updating from a version that stored an older watermark, the first sync succeeds and the next one sends the server checkpoint.

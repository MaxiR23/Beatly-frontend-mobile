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
- `sync_state`: `name`, `since`. The `likes` row is the watermark of the last
  completed sweep.

## Data

| Route                    | Paginated | Use                                                           |
| ------------------------ | --------- | ------------------------------------------------------------- |
| `GET /likes`             | yes       | the first sync, every page                                    |
| `GET /likes/sync?since=` | yes       | later syncs: the changes since the newest update, minus 60 s  |
| `POST /likes`            | no        | confirms a like                                               |
| `DELETE /likes/{id}`     | no        | confirms an unlike (the body is `ok: true` with `data: null`) |

All four send `Cache-Control: private, no-cache`; the mirror is the cache, so no
query hook reads a cache time.

The service classifies by outcome, not by status. Transient: any transport
failure and the reasons `upstream_error`, `upstream_timeout`, `internal_error`.
Rejected: any other reason (the routes list `invalid_request` and
`unauthorized`). `invalid_cursor` is handled by the shared paginated helper: the
cursor is dropped and the sweep restarts from `since`. No screen branches on a
reason yet, so none has an i18n key; a rejected write carries its `reason` for
the screen that maps it.

The watermark is written only when a whole sweep finished, so a failure in the
middle repeats the sweep and a POST response cannot move it past changes made on
another device. A full read (no watermark) never delivers an unlike, so after it
finishes, even with zero items, the watermark is stored as
`1970-01-01T00:00:00Z`: the next sync always uses `GET /likes/sync`, starting
from the beginning once and seeing every deletion, and the watermark then moves
to the newest `updated_at`. A pending row is never overwritten by a synced one, and an older
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

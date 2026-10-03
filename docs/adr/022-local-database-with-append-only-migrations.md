# 022. Local database with append-only migrations

Why the app keeps a local SQLite database behind a `db` port, and why its
migrations are numbered, append-only and never edited.

## Context

Likes must answer instantly and offline, and a like made without network
must survive a restart until the backend confirms it. The backend offers
`GET /likes/sync` precisely so a client keeps a local mirror with idempotent
upserts. The key-value `storage` port cannot upsert or query rows, so it does
not fit.

## Decision

- A `db` port in `core` with `run`, `all` and `transaction`. Rows come back as
  `unknown` and `core` parses them with zod, like any other edge.
- `expo-sqlite` behind `apps/mobile/src/adapters/db.ts`, its only importer. The
  adapter opens one database file, lazily, once, and runs a transaction as an
  exclusive one. That variant opens a second native connection, and a write on
  the first fails with `database is locked` while it is open, so the adapter
  serializes every top-level call (`run`, `all`, `transaction`) through one
  promise queue. The executor handed to a transaction's work bypasses the queue,
  or the work would wait on itself.
- The test fake wraps `node:sqlite`'s in-memory database, so `core` tests run
  the real SQL and the real migrations. It mirrors the adapter's guarantee: one
  top-level call at a time.
- Migrations are numbered, append-only, each applied in its own transaction and
  recorded in `schema_migrations`. `createCore()` applies them once, at app
  start. An applied migration is never edited and a test pins the hash of each
  shipped one, so an edit is a failing test. A change is a new migration.
- Signing out deletes the rows, not the file.

## Consequences

- One more port and one more adapter.
- The mirror is per device and is cleared on sign out.
- A failing migration leaves the likes service returning `storage_failure`
  until the next start; nothing else depends on the database yet.
- A schema change costs a migration, never an edit.

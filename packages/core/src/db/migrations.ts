// INFO: the local database's migrations: numbered, append-only, applied in order at startup and recorded in schema_migrations; an applied migration is never edited, a change is a new migration.
import { z } from "zod";

import type { DbPort } from "../ports/db.ts";
import type { LogPort } from "../ports/log.ts";
import type { StorageFailure } from "../services/recentSearches.ts";

export interface Migration {
  readonly version: number;
  readonly statements: readonly string[];
}

// likes: artists is the JSON array of {id, name}; liked and pending are 0/1; updated_at is the
// backend's, null for a row only ever changed locally; confirmed_liked is the last state the
// backend accepted (0/1), null when the backend never had the row as far as the mirror knows.
// sync_state: the watermark of a completed sweep, by name.
export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    statements: [
      `CREATE TABLE likes (
          track_id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          artists TEXT NOT NULL,
          album TEXT NOT NULL,
          album_id TEXT NOT NULL,
          thumbnail_url TEXT NOT NULL,
          duration_seconds INTEGER,
          liked INTEGER NOT NULL,
          updated_at TEXT,
          pending INTEGER NOT NULL,
          confirmed_liked INTEGER
        )`,
      `CREATE TABLE sync_state (name TEXT PRIMARY KEY NOT NULL, since TEXT NOT NULL)`,
    ],
  },
];

export type MigrateOutcome = { readonly kind: "success" } | StorageFailure;

const appliedSchema = z.object({ version: z.number().int() });

export async function migrate(
  db: DbPort,
  log: LogPort,
  migrations: readonly Migration[] = MIGRATIONS,
): Promise<MigrateOutcome> {
  let rows: unknown[];
  try {
    await db.run(
      "CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY NOT NULL)",
    );
    rows = await db.all("SELECT version FROM schema_migrations");
  } catch {
    log.warn("db.migration_unreadable");
    return { kind: "storage_failure", cause: "read" };
  }
  const parsed = z.array(appliedSchema).safeParse(rows);
  if (!parsed.success) {
    log.warn("db.migration_schema");
    return { kind: "storage_failure", cause: "schema" };
  }
  const applied = new Set(parsed.data.map((row) => row.version));
  for (const migration of migrations) {
    if (applied.has(migration.version)) continue;
    try {
      await db.transaction(async (tx) => {
        for (const statement of migration.statements) await tx.run(statement);
        await tx.run("INSERT INTO schema_migrations (version) VALUES (?)", [migration.version]);
      });
    } catch {
      log.error("db.migration_failed", { version: migration.version });
      return { kind: "storage_failure", cause: "write" };
    }
  }
  return { kind: "success" };
}

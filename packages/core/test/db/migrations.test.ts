// packages/core/test/db/migrations.test.ts
//
// Tests for the local database's migrations.
//
// Tested:
// - applies every migration in order on an empty database
// - applies nothing the second time
// - applies only the migrations appended since the last run
// - rolls back a failing migration and does not record it
// - returns a read failure when the database cannot be read
// - numbers the migrations 1..n with no gap
// - never edits a shipped migration (pinned hash per version)
//
// What is covered:
// - the runner against real SQLite (node:sqlite, in memory), the typed outcome, the log entry of a failure
// - Not applicable: expected empty and api failure, the runner calls no API
//
// Run with: pnpm --filter @beatly/core test -- migrations
//
// SEE: packages/core/src/db/migrations.ts

import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";
import { z } from "zod";

import { MIGRATIONS, migrate } from "../../src/db/migrations.ts";
import { createFakeDb } from "../fakes/db.ts";
import { createFakeLog } from "../fakes/log.ts";

// A new migration appends a line here; an existing line never changes.
const SHIPPED_HASHES: Record<number, string> = {
  1: "4b3522137d6b47ab24e36d258ce09a636e79a43891305915147f4d46f7a72feb",
};

const tables = (db: ReturnType<typeof createFakeDb>) =>
  z
    .array(z.object({ name: z.string() }))
    .parse(
      db.raw.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all(),
    )
    .map((row) => row.name);
const versions = (db: ReturnType<typeof createFakeDb>) =>
  z
    .array(z.object({ version: z.number() }))
    .parse(db.raw.prepare("SELECT version FROM schema_migrations ORDER BY version").all())
    .map((row) => row.version);

describe("migrate", () => {
  it("applies every migration in order on an empty database", async () => {
    const db = createFakeDb();
    const outcome = await migrate(db.port, createFakeLog().port);
    expect(outcome).toEqual({ kind: "success" });
    expect(versions(db)).toEqual(MIGRATIONS.map((m) => m.version));
    expect(tables(db)).toEqual(
      expect.arrayContaining(["likes", "sync_state", "schema_migrations"]),
    );
  });

  it("applies nothing the second time", async () => {
    const db = createFakeDb();
    const log = createFakeLog();
    await migrate(db.port, log.port);
    const outcome = await migrate(db.port, log.port);
    expect(outcome).toEqual({ kind: "success" });
    expect(versions(db)).toEqual(MIGRATIONS.map((m) => m.version));
    expect(log.entries).toEqual([]);
  });

  it("applies only the migrations appended since the last run", async () => {
    const db = createFakeDb();
    await migrate(db.port, createFakeLog().port);
    const extra = { version: 2, statements: ["CREATE TABLE extra (x TEXT)"] };
    const outcome = await migrate(db.port, createFakeLog().port, [...MIGRATIONS, extra]);
    expect(outcome).toEqual({ kind: "success" });
    expect(versions(db)).toEqual([1, 2]);
    expect(tables(db)).toContain("extra");
  });

  it("rolls back a failing migration and does not record it", async () => {
    const db = createFakeDb();
    const log = createFakeLog();
    const broken = {
      version: 2,
      statements: ["CREATE TABLE half (x TEXT)", "THIS IS NOT SQL"],
    };
    const outcome = await migrate(db.port, log.port, [...MIGRATIONS, broken]);
    expect(outcome).toEqual({ kind: "storage_failure", cause: "write" });
    expect(versions(db)).toEqual([1]);
    expect(tables(db)).not.toContain("half");
    expect(log.entries).toEqual([
      { level: "error", message: "db.migration_failed", fields: { version: 2 } },
    ]);
  });

  it("returns a read failure when the database cannot be read", async () => {
    const db = createFakeDb();
    db.fail("all");
    const outcome = await migrate(db.port, createFakeLog().port);
    expect(outcome).toEqual({ kind: "storage_failure", cause: "read" });
  });

  it("numbers the migrations 1..n with no gap", () => {
    expect(MIGRATIONS.map((m) => m.version)).toEqual(MIGRATIONS.map((_, index) => index + 1));
  });

  it("never edits a shipped migration", () => {
    for (const migration of MIGRATIONS) {
      const hash = createHash("sha256").update(JSON.stringify(migration.statements)).digest("hex");
      expect(hash, `migration ${String(migration.version)} changed after shipping`).toBe(
        SHIPPED_HASHES[migration.version],
      );
    }
  });
});

// apps/mobile/test/adapters/db.test.ts
//
// Tests for the db adapter.
//
// Tested:
// - createDbAdapter
//
// What is covered:
// - the database opens once for many calls, the statement and its parameters reach the engine, rows come back as the engine returns them, the work of a transaction runs inside an exclusive transaction through its executor, an engine rejection rejects, a call issued during a transaction waits for it
//
// Run with: pnpm --filter @beatly/mobile test -- adapters/db
//
// SEE: apps/mobile/src/adapters/db.ts

import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { createDbAdapter } from "../../src/adapters/db.ts";

interface Engine {
  runAsync: jest.Mock<(sql: string, params: unknown[]) => Promise<unknown>>;
  getAllAsync: jest.Mock<(sql: string, params: unknown[]) => Promise<unknown[]>>;
  withExclusiveTransactionAsync: jest.Mock<(task: (txn: Engine) => Promise<void>) => Promise<void>>;
}

const engine: Engine = {
  runAsync: jest.fn(),
  getAllAsync: jest.fn(),
  withExclusiveTransactionAsync: jest.fn(),
};
const txn: Engine = {
  runAsync: jest.fn(),
  getAllAsync: jest.fn(),
  withExclusiveTransactionAsync: jest.fn(),
};
const mockOpen = jest.fn<(name: string) => Promise<Engine>>();

jest.mock("expo-sqlite", () => ({
  openDatabaseAsync: (name: string) => mockOpen(name),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockOpen.mockResolvedValue(engine);
  engine.runAsync.mockResolvedValue({});
  engine.getAllAsync.mockResolvedValue([]);
  engine.withExclusiveTransactionAsync.mockImplementation((task) => task(txn));
  txn.runAsync.mockResolvedValue({});
  txn.getAllAsync.mockResolvedValue([]);
});

describe("createDbAdapter", () => {
  it("opens the database once for many calls", async () => {
    const db = createDbAdapter();
    await db.run("DELETE FROM likes");
    await db.all("SELECT 1");
    await db.transaction(() => Promise.resolve());
    expect(mockOpen).toHaveBeenCalledTimes(1);
    expect(mockOpen).toHaveBeenCalledWith("beatly.db");
  });

  it("passes the statement and its parameters to the engine", async () => {
    const db = createDbAdapter();
    await db.run("DELETE FROM likes WHERE track_id = ?", ["t1"]);
    await db.run("DELETE FROM likes");
    expect(engine.runAsync).toHaveBeenNthCalledWith(1, "DELETE FROM likes WHERE track_id = ?", [
      "t1",
    ]);
    expect(engine.runAsync).toHaveBeenNthCalledWith(2, "DELETE FROM likes", []);
  });

  it("returns the rows the engine returns", async () => {
    engine.getAllAsync.mockResolvedValue([{ track_id: "t1" }]);
    expect(await createDbAdapter().all("SELECT track_id FROM likes")).toEqual([{ track_id: "t1" }]);
  });

  it("runs the work inside an exclusive transaction and through its executor", async () => {
    txn.getAllAsync.mockResolvedValue([{ version: 1 }]);
    let rows: unknown[] = [];
    await createDbAdapter().transaction(async (tx) => {
      await tx.run("INSERT INTO x VALUES (?)", [1]);
      rows = await tx.all("SELECT version FROM schema_migrations");
    });
    expect(engine.withExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
    expect(txn.runAsync).toHaveBeenCalledWith("INSERT INTO x VALUES (?)", [1]);
    expect(rows).toEqual([{ version: 1 }]);
    expect(engine.runAsync).not.toHaveBeenCalled();
  });

  it("holds a call issued during a transaction until the transaction resolves", async () => {
    const db = createDbAdapter();
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const transaction = db.transaction(() => held);
    const run = db.run("DELETE FROM likes");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(engine.runAsync).not.toHaveBeenCalled();
    release();
    await Promise.all([transaction, run]);
    expect(engine.runAsync).toHaveBeenCalledTimes(1);
  });

  it("rejects when the engine rejects", async () => {
    engine.runAsync.mockRejectedValue(new Error("disk full"));
    await expect(createDbAdapter().run("DELETE FROM likes")).rejects.toThrow("disk full");
  });
});

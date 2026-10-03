// INFO: in-memory db port over node:sqlite's :memory: database, so tests run the real migrations; a test can make one operation reject. Like the adapter, it runs every top-level call one at a time.
import { DatabaseSync } from "node:sqlite";

import type { DbExecutor, DbPort } from "../../src/ports/db.ts";

type Op = "run" | "all" | "transaction";

export interface FakeDb {
  readonly port: DbPort;
  readonly raw: DatabaseSync;
  fail(op: Op): void;
}

export function createFakeDb(): FakeDb {
  const raw = new DatabaseSync(":memory:");
  const failing = new Set<Op>();
  let tail: Promise<void> = Promise.resolve();
  const guard = (op: Op): void => {
    if (failing.has(op)) throw new Error("db down");
  };
  // The executor handed to a transaction's work: it does not queue, or the work would wait on itself.
  const executor: DbExecutor = {
    run: (sql, params = []) =>
      Promise.resolve().then(() => {
        guard("run");
        raw.prepare(sql).run(...params);
      }),
    all: (sql, params = []) =>
      Promise.resolve().then((): unknown[] => {
        guard("all");
        return raw.prepare(sql).all(...params);
      }),
  };
  // The adapter's guarantee: one top-level call at a time, so two writers are never open at once.
  const enqueue = <T>(job: () => Promise<T>): Promise<T> => {
    const running = tail.then(job);
    tail = running.then(
      () => undefined,
      () => undefined,
    );
    return running;
  };
  const port: DbPort = {
    run: (sql, params) => enqueue(() => executor.run(sql, params)),
    all: (sql, params) => enqueue(() => executor.all(sql, params)),
    transaction: (work) =>
      enqueue(async () => {
        guard("transaction");
        raw.exec("BEGIN");
        try {
          await work(executor);
        } catch (error) {
          raw.exec("ROLLBACK");
          throw error;
        }
        raw.exec("COMMIT");
      }),
  };
  return {
    raw,
    port,
    fail: (op) => {
      failing.add(op);
    },
  };
}

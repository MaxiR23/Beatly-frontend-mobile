// INFO: the db adapter: the only importer of expo-sqlite; implements the db port over one database file opened once, lazily, running every top-level call one at a time.
import type { DbPort } from "@beatly/core";
import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";

export function createDbAdapter(): DbPort {
  let opening: Promise<SQLiteDatabase> | null = null;
  const open = (): Promise<SQLiteDatabase> => (opening ??= openDatabaseAsync("beatly.db"));

  // The exclusive transaction opens a second native connection and a write on the first fails with
  // "database is locked" meanwhile: so no two top-level calls overlap. The executor handed to a
  // transaction's work does not queue, or the work would wait on itself.
  let tail: Promise<void> = Promise.resolve();
  const enqueue = <T>(job: () => Promise<T>): Promise<T> => {
    const running = tail.then(job);
    tail = running.then(
      () => undefined,
      () => undefined,
    );
    return running;
  };

  return {
    run: (sql, params) =>
      enqueue(async () => {
        const db = await open();
        await db.runAsync(sql, [...(params ?? [])]);
      }),
    all: (sql, params) =>
      enqueue(async () => {
        const db = await open();
        return db.getAllAsync(sql, [...(params ?? [])]);
      }),
    transaction: (work) =>
      enqueue(async () => {
        const db = await open();
        await db.withExclusiveTransactionAsync(async (txn) => {
          await work({
            run: async (sql, params) => {
              await txn.runAsync(sql, [...(params ?? [])]);
            },
            all: (sql, params) => txn.getAllAsync(sql, [...(params ?? [])]),
          });
        });
      }),
  };
}

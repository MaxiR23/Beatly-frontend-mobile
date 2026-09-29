// INFO: in-memory storage port over a Map; a test can make one operation reject.
import type { StoragePort } from "../../src/ports/storage.ts";

type Op = "get" | "set" | "delete";

export interface FakeStorage {
  readonly port: StoragePort;
  readonly values: Map<string, string>;
  fail(op: Op): void;
}

export function createFakeStorage(initial: Record<string, string> = {}): FakeStorage {
  const values = new Map<string, string>(Object.entries(initial));
  const failing = new Set<Op>();
  const guard = (op: Op): void => {
    if (failing.has(op)) throw new Error("storage down");
  };
  return {
    values,
    fail: (op) => {
      failing.add(op);
    },
    port: {
      // eslint-disable-next-line @typescript-eslint/require-await -- an async fake turns a guard throw into a rejection, like the real store
      get: async (key) => {
        guard("get");
        return values.get(key) ?? null;
      },
      // eslint-disable-next-line @typescript-eslint/require-await -- same as get
      set: async (key, value) => {
        guard("set");
        values.set(key, value);
      },
      // eslint-disable-next-line @typescript-eslint/require-await -- same as get
      delete: async (key) => {
        guard("delete");
        values.delete(key);
      },
    },
  };
}

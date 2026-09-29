// INFO: the recent searches service: the list rules (trim, no empty, repeat moves to the top, newest first, keep 8) over the storage port; never throws.
import { z } from "zod";

import type { LogPort } from "../ports/log.ts";
import type { StoragePort } from "../ports/storage.ts";

export const RECENT_SEARCHES_KEY = "beatly-recent-searches";
export const RECENT_SEARCHES_LIMIT = 8;

export interface StorageFailure {
  readonly kind: "storage_failure";
  readonly cause: "read" | "write" | "schema";
}
export type RecentSearchesOutcome =
  { readonly kind: "success"; readonly data: readonly string[] } | StorageFailure;

export interface RecentSearchesService {
  list(): Promise<RecentSearchesOutcome>;
  add(query: string): Promise<RecentSearchesOutcome>;
  remove(query: string): Promise<RecentSearchesOutcome>;
  clear(): Promise<RecentSearchesOutcome>;
}

const storedSchema = z.array(z.string());

const same = (a: string, b: string): boolean => a.toLocaleLowerCase() === b.toLocaleLowerCase();

export function createRecentSearchesService(deps: {
  storage: StoragePort;
  log: LogPort;
}): RecentSearchesService {
  const { storage, log } = deps;

  const failure = (cause: StorageFailure["cause"]): StorageFailure => {
    log.warn(`recent_searches.${cause}`);
    return { kind: "storage_failure", cause };
  };

  async function list(): Promise<RecentSearchesOutcome> {
    let raw: string | null;
    try {
      raw = await storage.get(RECENT_SEARCHES_KEY);
    } catch {
      return failure("read");
    }
    if (raw === null) return { kind: "success", data: [] };
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return failure("schema");
    }
    const parsed = storedSchema.safeParse(json);
    if (!parsed.success) return failure("schema");
    return { kind: "success", data: parsed.data.slice(0, RECENT_SEARCHES_LIMIT) };
  }

  async function write(next: readonly string[]): Promise<RecentSearchesOutcome> {
    try {
      await storage.set(RECENT_SEARCHES_KEY, JSON.stringify(next));
    } catch {
      return failure("write");
    }
    return { kind: "success", data: next };
  }

  return {
    list,
    async add(query) {
      const trimmed = query.trim();
      const current = await list();
      if (trimmed === "") return current;
      // A corrupted stored value is replaced by a fresh list, so the feature can recover.
      if (current.kind !== "success" && current.cause !== "schema") return current;
      const previous = current.kind === "success" ? current.data : [];
      const next = [trimmed, ...previous.filter((q) => !same(q, trimmed))].slice(
        0,
        RECENT_SEARCHES_LIMIT,
      );
      return write(next);
    },
    async remove(query) {
      const current = await list();
      if (current.kind !== "success") return current;
      return write(current.data.filter((q) => !same(q, query.trim())));
    },
    async clear() {
      try {
        await storage.delete(RECENT_SEARCHES_KEY);
      } catch {
        return failure("write");
      }
      return { kind: "success", data: [] };
    },
  };
}

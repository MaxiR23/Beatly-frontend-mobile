// apps/mobile/test/auth/sessionUserId.test.ts
//
// Tests for the stored session's user id reader.
//
// Tested:
// - sessionUserId
//
// What is covered:
// - an expired chunked session reads its user id, no session, no id, a value that is not JSON
//
// Run with: pnpm --filter @beatly/mobile test -- sessionUserId
//
// SEE: apps/mobile/src/auth/sessionUserId.ts

import { describe, expect, it } from "@jest/globals";

import { createChunkedStorage, type SecureKeyValueStore } from "../../src/auth/chunkedStorage.ts";
import { sessionUserId } from "../../src/auth/sessionUserId.ts";

function mapStorage() {
  const map = new Map<string, string>();
  const store: SecureKeyValueStore = {
    getItem: (key) => Promise.resolve(map.get(key) ?? null),
    setItem: (key, value) => {
      map.set(key, value);
      return Promise.resolve();
    },
    removeItem: (key) => {
      map.delete(key);
      return Promise.resolve();
    },
  };
  return createChunkedStorage(store);
}

describe("sessionUserId", () => {
  it("reads the user id of a session stored in chunks", async () => {
    const storage = mapStorage();
    const session = {
      access_token: "x".repeat(600),
      refresh_token: "r",
      expires_at: 0,
      user: { id: "u1", email: "listener@example.com" },
    };
    await storage.setItem("beatly-session", JSON.stringify(session));
    expect(sessionUserId(await storage.getItem("beatly-session"))).toBe("u1");
  });

  it("returns null without a stored session", () => {
    expect(sessionUserId(null)).toBeNull();
  });

  it("returns null for a session whose user has no id", () => {
    expect(sessionUserId(JSON.stringify({ user: { email: "listener@example.com" } }))).toBeNull();
    expect(sessionUserId(JSON.stringify({ user: { id: "" } }))).toBeNull();
    expect(sessionUserId(JSON.stringify({ access_token: "a" }))).toBeNull();
  });

  it("throws for a stored value that is not JSON", () => {
    expect(() => sessionUserId("not json")).toThrow();
  });
});

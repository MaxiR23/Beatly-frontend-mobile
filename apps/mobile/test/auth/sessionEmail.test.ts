// apps/mobile/test/auth/sessionEmail.test.ts
//
// Tests for the stored session's email reader.
//
// Tested:
// - sessionEmail
//
// What is covered:
// - an expired chunked session reads its email, no session, no email, a value that is not JSON
//
// Run with: pnpm --filter @beatly/mobile test -- sessionEmail
//
// SEE: apps/mobile/src/auth/sessionEmail.ts

import { describe, expect, it } from "@jest/globals";

import { createChunkedStorage, type SecureKeyValueStore } from "../../src/auth/chunkedStorage.ts";
import { sessionEmail } from "../../src/auth/sessionEmail.ts";

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

describe("sessionEmail", () => {
  it("reads the email of a session stored in chunks", async () => {
    const storage = mapStorage();
    const session = {
      access_token: "x".repeat(600),
      refresh_token: "r",
      expires_at: 0,
      user: { id: "u1", email: "listener@example.com" },
    };
    await storage.setItem("beatly-session", JSON.stringify(session));
    expect(sessionEmail(await storage.getItem("beatly-session"))).toBe("listener@example.com");
  });

  it("returns null without a stored session", () => {
    expect(sessionEmail(null)).toBeNull();
  });

  it("returns null for a session whose user has no email", () => {
    expect(sessionEmail(JSON.stringify({ user: { id: "u1" } }))).toBeNull();
    expect(sessionEmail(JSON.stringify({ user: { id: "u1", email: "" } }))).toBeNull();
    expect(sessionEmail(JSON.stringify({ access_token: "a" }))).toBeNull();
  });

  it("throws for a stored value that is not JSON", () => {
    expect(() => sessionEmail("not json")).toThrow();
  });
});

// packages/core/test/fakes/auth.test.ts
//
// Tests for the in-memory auth port.
//
// Tested:
// - createFakeAuth().port.getEmail
//
// What is covered:
// - the email of a signed-in session, and none when signed out
//
// Run with: pnpm --filter @beatly/core test -- fakes/auth
//
// SEE: packages/core/test/fakes/auth.ts

import { describe, expect, it } from "vitest";

import { createFakeAuth } from "./auth.ts";

describe("createFakeAuth getEmail", () => {
  it("returns the email of the signed-in session", async () => {
    expect(await createFakeAuth().port.getEmail()).toBe("listener@example.com");
  });

  it("returns no email when signed out", async () => {
    expect(await createFakeAuth(null).port.getEmail()).toBeNull();
  });
});

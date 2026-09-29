// packages/core/test/domain/profile.test.ts
//
// Tests for the profile name mapping.
//
// Tested:
// - profileName
//
// What is covered:
// - the username wins, display_name is the fallback, null when both are empty
//
// Run with: pnpm --filter @beatly/core test -- profile
//
// SEE: packages/core/src/domain/profile.ts

import { describe, expect, it } from "vitest";

import { profileName, type Profile } from "../../src/domain/profile.ts";

const base: Profile = {
  id: "00000000-0000-0000-0000-000000000001",
  role: "user",
  username: "maxi_23",
  display_name: "Maxi",
  avatar_url: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("profileName", () => {
  it("uses the username when there is one", () => {
    expect(profileName(base)).toBe("maxi_23");
  });

  it("falls back to the display name when the username is empty", () => {
    expect(profileName({ ...base, username: null })).toBe("Maxi");
  });

  it("returns null when both are empty", () => {
    expect(profileName({ ...base, username: null, display_name: null })).toBeNull();
  });
});

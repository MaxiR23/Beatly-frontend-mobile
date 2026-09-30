// apps/mobile/test/screens/playlist/playlistSource.test.ts
//
// Tests for the playlist source param.
//
// Tested:
// - playlistSource
//
// What is covered:
// - liked, genre, user, a missing param and an unknown string
//
// Run with: pnpm --filter @beatly/mobile test -- playlistSource
//
// SEE: apps/mobile/src/screens/playlist/playlistSource.ts

import { describe, expect, it } from "@jest/globals";

import { playlistSource } from "../../../src/screens/playlist/playlistSource.ts";

describe("playlistSource", () => {
  it("reads liked and genre", () => {
    expect(playlistSource("liked")).toBe("liked");
    expect(playlistSource("genre")).toBe("genre");
  });

  it("reads user", () => {
    expect(playlistSource("user")).toBe("user");
  });

  it("reads a missing or unknown source as user", () => {
    expect(playlistSource(undefined)).toBe("user");
    expect(playlistSource("external")).toBe("user");
  });
});

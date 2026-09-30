// apps/mobile/test/screens/playlist/playlistMeta.test.ts
//
// Tests for the playlist meta line.
//
// Tested:
// - playlistMeta
//
// What is covered:
// - private and public, no visibility, the singular, minutes only, hours and minutes
//
// Run with: pnpm --filter @beatly/mobile test -- playlistMeta
//
// SEE: apps/mobile/src/screens/playlist/playlistMeta.ts

import { describe, expect, it } from "@jest/globals";

import { useT } from "../../../src/adapters/i18n.ts";
import { playlistMeta } from "../../../src/screens/playlist/playlistMeta.ts";

const t = useT("playlist");

describe("playlistMeta", () => {
  it("joins Private, the count and the duration in hours and minutes", () => {
    expect(playlistMeta({ visibility: "private", count: 2, durationSeconds: 4440 }, t)).toBe(
      "Private · 2 songs · 1 h 14 min",
    );
  });

  it("draws Public for a public playlist", () => {
    expect(playlistMeta({ visibility: "public", count: 2, durationSeconds: 4440 }, t)).toBe(
      "Public · 2 songs · 1 h 14 min",
    );
  });

  it("omits the visibility when there is none", () => {
    expect(playlistMeta({ visibility: null, count: 12, durationSeconds: 2400 }, t)).toBe(
      "12 songs · 40 min",
    );
  });

  it("draws the singular song and minutes only under an hour", () => {
    expect(playlistMeta({ visibility: null, count: 1, durationSeconds: 240 }, t)).toBe(
      "1 song · 4 min",
    );
  });
});

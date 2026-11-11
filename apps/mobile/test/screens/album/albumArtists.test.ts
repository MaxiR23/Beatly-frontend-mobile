// apps/mobile/test/screens/album/albumArtists.test.ts
//
// Tests for the album artists line.
//
// Tested:
// - albumArtists
//
// What is covered:
// - one artist, two artists joined with the separator, in both languages
//
// Run with: pnpm --filter @beatly/mobile test -- albumArtists
//
// SEE: apps/mobile/src/screens/album/albumArtists.ts

import { describe, expect, it } from "@jest/globals";

import { i18n, useT } from "../../../src/adapters/i18n.ts";
import { albumArtists } from "../../../src/screens/album/albumArtists.ts";

const t = useT("album");

describe("albumArtists", () => {
  it("draws the name of a single artist", () => {
    expect(albumArtists({ artists: [{ name: "A" }] }, t)).toBe("A");
  });

  it("joins two artists with the separator", () => {
    expect(albumArtists({ artists: [{ name: "A" }, { name: "B" }] }, t)).toBe("A, B");
  });

  it("joins them with the same separator in es", () => {
    const tEs = i18n.getFixedT("es", "album");
    expect(albumArtists({ artists: [{ name: "A" }, { name: "B" }] }, tEs)).toBe("A, B");
  });
});

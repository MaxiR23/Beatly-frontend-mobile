// apps/mobile/test/screens/album/albumMeta.test.ts
//
// Tests for the album meta line.
//
// Tested:
// - albumMeta
//
// What is covered:
// - hours and minutes, minutes only, a null year, a null count, the singular
//
// Run with: pnpm --filter @beatly/mobile test -- albumMeta
//
// SEE: apps/mobile/src/screens/album/albumMeta.ts

import { describe, expect, it } from "@jest/globals";

import { useT } from "../../../src/adapters/i18n.ts";
import { albumMeta } from "../../../src/screens/album/albumMeta.ts";
import { albumFixture } from "../../helpers/core.tsx";

const t = useT("album");

describe("albumMeta", () => {
  it("joins the kind, year, count and duration in hours and minutes", () => {
    expect(albumMeta({ ...albumFixture, duration_seconds: 4440, track_count: 13 }, t)).toBe(
      "Album · 2013 · 13 songs · 1 h 14 min",
    );
  });

  it("draws minutes only under an hour", () => {
    expect(albumMeta({ ...albumFixture, duration_seconds: 1500 }, t)).toBe(
      "Album · 2013 · 13 songs · 25 min",
    );
  });

  it("omits the year when it is null", () => {
    expect(albumMeta({ ...albumFixture, year: null }, t)).toBe("Album · 13 songs · 1 h 14 min");
  });

  it("omits the count when it is null", () => {
    expect(albumMeta({ ...albumFixture, track_count: null }, t)).toBe("Album · 2013 · 1 h 14 min");
  });

  it("uses the singular for one song", () => {
    expect(albumMeta({ ...albumFixture, track_count: 1, duration_seconds: 240 }, t)).toBe(
      "Album · 2013 · 1 song · 4 min",
    );
  });
});

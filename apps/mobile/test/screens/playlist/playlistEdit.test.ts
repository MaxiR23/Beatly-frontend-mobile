// apps/mobile/test/screens/playlist/playlistEdit.test.ts
//
// Tests for the edit sheet's PATCH body.
//
// Tested:
// - playlistEditPatch
//
// What is covered:
// - nothing changed, title only, description only, both, an emptied description as null, trimming, a stored null or blank description left alone
//
// Run with: pnpm --filter @beatly/mobile test -- playlistEdit
//
// SEE: apps/mobile/src/screens/playlist/playlistEdit.ts

import { describe, expect, it } from "@jest/globals";

import { playlistEditPatch } from "../../../src/screens/playlist/playlistEdit.ts";

const original = { title: "Road trip", description: "Windows down" };

describe("playlistEditPatch", () => {
  it("returns null when nothing changed", () => {
    expect(
      playlistEditPatch(original, { title: "Road trip", description: "Windows down" }),
    ).toBeNull();
    expect(
      playlistEditPatch(original, { title: "  Road trip ", description: " Windows down  " }),
    ).toBeNull();
    expect(
      playlistEditPatch(
        { title: "Road trip", description: null },
        { title: "Road trip", description: "" },
      ),
    ).toBeNull();
  });

  it("returns only the trimmed title when only the title changed", () => {
    expect(
      playlistEditPatch(original, { title: "  Renamed ", description: "Windows down" }),
    ).toEqual({
      title: "Renamed",
    });
  });

  it("returns only the description when only it changed", () => {
    expect(playlistEditPatch(original, { title: "Road trip", description: " Top down " })).toEqual({
      description: "Top down",
    });
  });

  it("returns both when both changed", () => {
    expect(playlistEditPatch(original, { title: "Renamed", description: "New" })).toEqual({
      title: "Renamed",
      description: "New",
    });
  });

  it("sends an emptied description as null", () => {
    expect(playlistEditPatch(original, { title: "Road trip", description: "   " })).toEqual({
      description: null,
    });
  });

  it("treats a stored blank description as no description", () => {
    expect(
      playlistEditPatch(
        { title: "Road trip", description: "  " },
        { title: "Road trip", description: "" },
      ),
    ).toBeNull();
  });
});

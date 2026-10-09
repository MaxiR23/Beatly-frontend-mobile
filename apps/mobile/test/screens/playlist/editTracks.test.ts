// apps/mobile/test/screens/playlist/editTracks.test.ts
//
// Tests for the optimistic list helpers of the playlist edit mode.
//
// Tested:
// - movedItems
// - withoutIndex
//
// What is covered:
// - a move down, up, to the first place and to the last place, not mutating the input
// - removing the first, a middle and the last item, not mutating the input
//
// Run with: pnpm --filter @beatly/mobile test -- editTracks
//
// SEE: apps/mobile/src/screens/playlist/editTracks.ts

import { describe, expect, it } from "@jest/globals";

import { movedItems, withoutIndex } from "../../../src/screens/playlist/editTracks.ts";

const list = ["a", "b", "c", "d", "e"];

describe("movedItems", () => {
  it("moves an item down to its final index", () => {
    expect(movedItems(list, 1, 3)).toEqual(["a", "c", "d", "b", "e"]);
  });

  it("moves an item up to its final index", () => {
    expect(movedItems(list, 3, 1)).toEqual(["a", "d", "b", "c", "e"]);
  });

  it("moves an item to the first place", () => {
    expect(movedItems(list, 4, 0)).toEqual(["e", "a", "b", "c", "d"]);
  });

  it("moves an item to the last place", () => {
    expect(movedItems(list, 0, 4)).toEqual(["b", "c", "d", "e", "a"]);
  });

  it("does not change the list it was given", () => {
    movedItems(list, 0, 4);
    expect(list).toEqual(["a", "b", "c", "d", "e"]);
  });
});

describe("withoutIndex", () => {
  it("removes the first item", () => {
    expect(withoutIndex(list, 0)).toEqual(["b", "c", "d", "e"]);
  });

  it("removes a middle item", () => {
    expect(withoutIndex(list, 2)).toEqual(["a", "b", "d", "e"]);
  });

  it("removes the last item", () => {
    expect(withoutIndex(list, 4)).toEqual(["a", "b", "c", "d"]);
  });

  it("does not change the list it was given", () => {
    withoutIndex(list, 1);
    expect(list).toHaveLength(5);
  });
});

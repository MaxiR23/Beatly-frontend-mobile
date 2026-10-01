// apps/mobile/test/screens/player/lyricsLine.test.ts
//
// Tests for the lyrics line helper.
//
// Tested:
// - currentLineIndex
//
// What is covered:
// - before the first line, the last started line, the last line after the end, lines with a null start skipped
//
// Run with: pnpm --filter @beatly/mobile test -- lyricsLine
//
// SEE: apps/mobile/src/screens/player/lyricsLine.ts

import type { LyricsLine } from "@beatly/core";
import { describe, expect, it } from "@jest/globals";

import { currentLineIndex } from "../../../src/screens/player/lyricsLine.ts";

const line = (text: string, start: number | null): LyricsLine => ({
  text,
  start_ms: start,
  end_ms: null,
});
const lines = [line("a", 1000), line("b", 5000), line("c", 9000)];

describe("currentLineIndex", () => {
  it("is -1 before the first line", () => {
    expect(currentLineIndex(lines, 999)).toBe(-1);
    expect(currentLineIndex([], 5000)).toBe(-1);
  });

  it("is the last line whose start has passed", () => {
    expect(currentLineIndex(lines, 1000)).toBe(0);
    expect(currentLineIndex(lines, 6000)).toBe(1);
  });

  it("is the last line after the end", () => {
    expect(currentLineIndex(lines, 999_999)).toBe(2);
  });

  it("skips lines with a null start", () => {
    expect(currentLineIndex([line("a", null), line("b", null)], 5000)).toBe(-1);
    expect(currentLineIndex([line("a", 0), line("b", null)], 5000)).toBe(0);
  });
});

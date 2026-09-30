// INFO: the index of the synced lyrics line playing at a position: the last line whose start has passed, -1 before the first.
import type { LyricsLine } from "@beatly/core";

export function currentLineIndex(lines: readonly LyricsLine[], positionMs: number): number {
  let found = -1;
  lines.forEach((line, index) => {
    if (line.start_ms !== null && line.start_ms <= positionMs) found = index;
  });
  return found;
}

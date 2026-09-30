// INFO: keeps the items that map to a playable track and finds the tapped one among them.
import type { PlayableTrack } from "@beatly/core";

export function toQueue<T>(
  items: readonly T[],
  tapped: number,
  toPlayable: (item: T) => PlayableTrack | null,
): { tracks: PlayableTrack[]; index: number } | null {
  const tracks: PlayableTrack[] = [];
  let index = -1;
  items.forEach((item, position) => {
    const playable = toPlayable(item);
    if (playable === null) return;
    if (position === tapped) index = tracks.length;
    tracks.push(playable);
  });
  return index === -1 ? null : { tracks, index };
}

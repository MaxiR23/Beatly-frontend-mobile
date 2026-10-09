// INFO: keeps the items that map to a playable track and finds the tapped one among them, or the first or a random one for a whole list; maps a track of the up next or related routes to a playable track.
import type { PlayableTrack, TrackRef } from "@beatly/core";

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

// Every playable item in order; null when none. Starts at the first track or at a random one.
export function wholeQueue<T>(
  items: readonly T[],
  toPlayable: (item: T) => PlayableTrack | null,
  start: "first" | "random",
  random: () => number = Math.random,
): { tracks: PlayableTrack[]; index: number } | null {
  const tracks: PlayableTrack[] = [];
  for (const item of items) {
    const playable = toPlayable(item);
    if (playable !== null) tracks.push(playable);
  }
  if (tracks.length === 0) return null;
  const index =
    start === "first" ? 0 : Math.min(Math.floor(random() * tracks.length), tracks.length - 1);
  return { tracks, index };
}

export function playableOf(ref: TrackRef): PlayableTrack {
  return {
    trackId: ref.track_id,
    title: ref.title,
    artists: ref.artists,
    album: ref.album,
    albumId: ref.album_id,
    coverUrl: ref.thumbnail_url,
    durationSeconds: ref.duration_seconds,
  };
}

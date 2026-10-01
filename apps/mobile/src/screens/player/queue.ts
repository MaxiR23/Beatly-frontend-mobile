// INFO: keeps the items that map to a playable track and finds the tapped one among them; maps a track of the up next or related routes to a playable track.
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

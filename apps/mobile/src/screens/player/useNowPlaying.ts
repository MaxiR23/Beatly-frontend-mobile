// INFO: what the track rows and the detail play button draw from the playback state: a row of the current track (every occurrence) is playing or paused; a list's play button is idle unless the list is the source; plus the reduce motion setting for their animations.
import type { PlaybackSource, PlaybackStatus } from "@beatly/core";

import { usePlayback } from "./usePlayback.ts";
import { useReduceMotion } from "./useReduceMotion.ts";

export type NowPlaying = "playing" | "paused";
export type ListPlayback = "idle" | "loading" | "playing" | "paused";

// The row mark of a playback status; undefined when nothing is current.
export function nowPlayingOf(status: PlaybackStatus): NowPlaying | undefined {
  switch (status) {
    case "loading":
    case "playing":
      return "playing";
    case "paused":
    case "failed":
      return "paused";
    case "idle":
      return undefined;
  }
}

// The detail play button of a list, from the status and whether this list is the source.
export function listPlaybackOf(status: PlaybackStatus, isSource: boolean): ListPlayback {
  if (!isSource) return "idle";
  switch (status) {
    case "loading":
      return "loading";
    case "playing":
      return "playing";
    case "paused":
    case "failed":
      return "paused";
    case "idle":
      return "idle";
  }
}

export function useNowPlaying(): {
  of: (trackId: string | null) => NowPlaying | undefined;
  reduceMotion: boolean;
} {
  const currentId = usePlayback((s) => s.current?.trackId ?? null);
  const status = usePlayback((s) => s.status);
  const reduceMotion = useReduceMotion();
  return {
    of: (trackId) => (trackId !== null && trackId === currentId ? nowPlayingOf(status) : undefined),
    reduceMotion,
  };
}

// id null while the screen's data loads: idle.
export function useListPlayback(kind: PlaybackSource["kind"], id: string | null): ListPlayback {
  const status = usePlayback((s) => s.status);
  const sourceKind = usePlayback((s) => s.source?.kind ?? null);
  const sourceId = usePlayback((s) => s.source?.id ?? null);
  return listPlaybackOf(status, id !== null && sourceKind === kind && sourceId === id);
}

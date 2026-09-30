// INFO: reads the playback controller: usePlayback selects from its state and usePlaybackActions returns it; a selector returns a field or a primitive, never a new object, or useSyncExternalStore loops.
import type { PlaybackController, PlaybackState } from "@beatly/core";
import { useSyncExternalStore } from "react";

import { useCore } from "../../providers/CoreProvider.tsx";

export function usePlayback<T>(select: (state: PlaybackState) => T): T {
  const { playback } = useCore();
  return useSyncExternalStore(playback.subscribe, () => select(playback.getState()));
}

export function usePlaybackActions(): PlaybackController {
  return useCore().playback;
}

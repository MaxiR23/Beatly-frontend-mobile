// INFO: which single strip the bottom of the app shows: offline, or a failed track with its reason (no connection, too slow, any other); a failed track wins over plain offline, so there is never more than one strip.
import type { PlaybackFailure } from "@beatly/core";

export type BottomStatusKind = "offline" | "playbackOffline" | "playbackSlow" | "playbackFailed";

// startFailed: a play-all that could not start offline (playStart.ts); it reads as the offline playback strip before anything else.
export function bottomStatusOf(
  online: boolean,
  failure: PlaybackFailure | null,
  startFailed = false,
): BottomStatusKind | null {
  if (startFailed) return "playbackOffline";
  if (failure !== null) {
    if (!online || failure === "network") return "playbackOffline";
    if (failure === "timeout") return "playbackSlow";
    return "playbackFailed";
  }
  return online ? null : "offline";
}

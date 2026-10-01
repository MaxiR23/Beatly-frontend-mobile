// INFO: the listening counter: counts real listening of the current track from the playback controller (seeks and pauses do not count) and, at 30 seconds of one listen, posts the play once, detached; a track without album, cover or an artist with an id is not registered, and a failure is only logged.
import type { LogPort } from "../ports/log.ts";
import type { ActivityService, PlayArtist } from "./activity.ts";
import type { PlayableTrack, PlaybackController } from "./playback.ts";

export const PLAY_AFTER_SECONDS = 30;
// The engine reports every 100 ms; a larger step is a seek or a stall, not listening.
export const MAX_LISTEN_STEP_SECONDS = 2;

export function createListeningCounter(deps: {
  playback: Pick<PlaybackController, "getState" | "subscribe">;
  activity: Pick<ActivityService, "logPlay">;
  log: LogPort;
}): () => void {
  const { playback, activity, log } = deps;

  let listen = playback.getState().listen;
  let listened = 0;
  let last = playback.getState().positionSeconds;
  let done = false;

  const register = (track: PlayableTrack): void => {
    const artists: PlayArtist[] = [];
    for (const artist of track.artists) {
      if (artist.id !== null) artists.push({ id: artist.id, name: artist.name });
    }
    let missing: string | null = null;
    if (track.album === null || track.albumId === null) missing = "album";
    else if (track.coverUrl === null) missing = "thumbnail_url";
    else if (artists.length === 0) missing = "artists";
    if (
      missing !== null ||
      track.album === null ||
      track.albumId === null ||
      track.coverUrl === null
    ) {
      log.debug("listening.play_skipped", {
        trackId: track.trackId,
        missing: missing ?? "unknown",
      });
      return;
    }
    void activity
      .logPlay({
        track_id: track.trackId,
        title: track.title,
        artists,
        album: track.album,
        album_id: track.albumId,
        thumbnail_url: track.coverUrl,
        ...(track.durationSeconds !== null ? { duration_seconds: track.durationSeconds } : {}),
      })
      .then((outcome) => {
        if (outcome.kind === "success") return;
        log.warn("listening.play_failed", {
          trackId: track.trackId,
          kind: outcome.kind,
          detail: outcome.kind === "api_failure" ? outcome.reason : outcome.cause,
        });
      });
  };

  return playback.subscribe(() => {
    const state = playback.getState();
    if (state.current === null) {
      listen = state.listen;
      return;
    }
    if (state.listen !== listen) {
      listen = state.listen;
      listened = 0;
      last = state.positionSeconds;
      done = false;
      return;
    }
    const step = state.positionSeconds - last;
    last = state.positionSeconds;
    if (done || state.status !== "playing" || step <= 0 || step > MAX_LISTEN_STEP_SECONDS) return;
    listened += step;
    if (listened < PLAY_AFTER_SECONDS) return;
    done = true;
    register(state.current);
  });
}

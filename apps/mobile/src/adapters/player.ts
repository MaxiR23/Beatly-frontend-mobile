// INFO: the player adapter: the only importer of expo-audio; implements the player port in the background, with the lock screen and its next and previous; the engine is created once and kept until unload; no library type leaves it.
import type { LogPort, NowPlaying, PlayerEvent, PlayerPort } from "@beatly/core";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import type { AudioMetadata, AudioPlayer, AudioStatus } from "expo-audio";

// How often the engine reports its position, in milliseconds.
// Synced lyrics switch on a tick, so the tick bounds how late a line lights up.
const UPDATE_INTERVAL_MS = 100;

function toEvents(status: AudioStatus): PlayerEvent[] {
  if (status.error !== null) return [{ type: "error", message: status.error }];
  const events: PlayerEvent[] = [
    {
      type: "progress",
      positionSeconds: status.currentTime,
      durationSeconds:
        Number.isFinite(status.duration) && status.duration > 0 ? status.duration : null,
      playing: status.playing,
      buffering: status.isBuffering,
    },
  ];
  if (status.didJustFinish) events.push({ type: "ended" });
  return events;
}

function toMetadata(info: NowPlaying, artistSeparator: string): AudioMetadata {
  return {
    title: info.title,
    ...(info.artists.length > 0 ? { artist: info.artists.join(artistSeparator) } : {}),
    ...(info.album === null ? {} : { albumTitle: info.album }),
    ...(info.artworkUrl === null ? {} : { artworkUrl: info.artworkUrl }),
    ...(info.durationSeconds === null ? {} : { duration: info.durationSeconds }),
  };
}

export function createPlayerAdapter({
  log,
  artistSeparator,
}: {
  log: LogPort;
  // Read at call time, so the lock screen's artist line follows the language.
  artistSeparator: () => string;
}): PlayerPort {
  const listeners = new Set<(event: PlayerEvent) => void>();
  let engine: AudioPlayer | null = null;
  let lockScreen = false;

  const emit = (event: PlayerEvent): void => {
    for (const listener of [...listeners]) listener(event);
  };

  const ensure = (): AudioPlayer => {
    if (engine !== null) return engine;
    // Without keepAudioSessionActive iOS deactivates the audio session on the pause between tracks, and a non-mixable session cannot start again from the background.
    const created = createAudioPlayer(null, {
      updateInterval: UPDATE_INTERVAL_MS,
      keepAudioSessionActive: true,
    });
    created.addListener("playbackStatusUpdate", (status) => {
      for (const event of toEvents(status)) emit(event);
    });
    // The lock screen's next and previous come from the expo-audio patch (ADR 037); without it, as in Expo Go, they never fire.
    created.addListener("onRemoteNextTrack", () => {
      emit({ type: "remoteNext" });
    });
    created.addListener("onRemotePreviousTrack", () => {
      emit({ type: "remotePrevious" });
    });
    engine = created;
    // Without playsInSilentMode iOS plays nothing with the silent switch on.
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
    }).catch((error: unknown) => {
      log.warn("player.audio_mode_failed", {
        message: error instanceof Error ? error.message : String(error),
      });
    });
    return created;
  };

  return {
    load: (url) => {
      // expo-audio's AudioSource is an object with a `uri` string (headers and name optional).
      const fail = (error: unknown): void => {
        const message = error instanceof Error ? error.message : String(error);
        log.warn("player.load_failed", { message });
        emit({ type: "error", message });
      };
      try {
        // The native call may reject asynchronously even though the type says void.
        const player = ensure();
        const replace: (source: { uri: string }) => unknown = player.replace.bind(player);
        const pending = replace({ uri: url });
        if (pending instanceof Promise) pending.catch(fail);
      } catch (error) {
        fail(error);
      }
    },
    play: () => {
      engine?.play();
    },
    pause: () => {
      engine?.pause();
    },
    seek: async (seconds) => {
      if (engine === null) return;
      try {
        await engine.seekTo(seconds);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log.warn("player.seek_failed", { message });
        emit({ type: "error", message });
      }
    },
    setNowPlaying: (info) => {
      const current = engine;
      if (current === null) return;
      try {
        if (info === null) {
          if (lockScreen) {
            lockScreen = false;
            current.clearLockScreenControls();
          }
          return;
        }
        const metadata = toMetadata(info, artistSeparator());
        if (lockScreen) {
          current.updateLockScreenMetadata(metadata);
        } else {
          current.setActiveForLockScreen(true, metadata, {
            showNextTrack: true,
            showPreviousTrack: true,
          });
          lockScreen = true;
        }
      } catch (error) {
        // The lock screen is not playback: logged, not emitted as a player error.
        log.warn("player.lock_screen_failed", {
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
    unload: () => {
      // Never replace(null): iOS declares replace with a non-optional AudioSource.
      // remove() pauses and releases the engine; the next load recreates it.
      const current = engine;
      if (current === null) return;
      engine = null;
      try {
        if (lockScreen) {
          lockScreen = false;
          current.clearLockScreenControls();
        }
        current.pause();
        current.remove();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log.warn("player.unload_failed", { message });
        emit({ type: "error", message });
      }
    },
    onEvent: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

// INFO: the player adapter: the only importer of expo-audio; implements the player port in the foreground only, with no library type leaving it.
import type { LogPort, PlayerEvent, PlayerPort } from "@beatly/core";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import type { AudioPlayer, AudioStatus } from "expo-audio";

// How often the engine reports its position, in milliseconds.
const UPDATE_INTERVAL_MS = 250;

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

export function createPlayerAdapter({ log }: { log: LogPort }): PlayerPort {
  const listeners = new Set<(event: PlayerEvent) => void>();
  let engine: AudioPlayer | null = null;

  const emit = (event: PlayerEvent): void => {
    for (const listener of [...listeners]) listener(event);
  };

  const ensure = (): AudioPlayer => {
    if (engine !== null) return engine;
    const created = createAudioPlayer(null, { updateInterval: UPDATE_INTERVAL_MS });
    created.addListener("playbackStatusUpdate", (status) => {
      for (const event of toEvents(status)) emit(event);
    });
    engine = created;
    // Without playsInSilentMode iOS plays nothing with the silent switch on.
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false }).catch(
      (error: unknown) => {
        log.warn("player.audio_mode_failed", {
          message: error instanceof Error ? error.message : String(error),
        });
      },
    );
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
    unload: () => {
      // Never replace(null): iOS declares replace with a non-optional AudioSource.
      // remove() pauses and releases the engine; the next load recreates it.
      const current = engine;
      if (current === null) return;
      engine = null;
      try {
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

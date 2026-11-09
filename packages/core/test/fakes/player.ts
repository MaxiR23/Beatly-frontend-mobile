// INFO: in-memory player port with a manual clock: calls are recorded in order and a test emits events or advances the position; an engine duration and an engine end position can be set, to fake the iOS doubled duration or an on-time end.
import type { PlayerEvent, PlayerPort } from "../../src/ports/player.ts";

type PlayerCall =
  | { readonly type: "load"; readonly url: string }
  | { readonly type: "play" }
  | { readonly type: "pause" }
  | { readonly type: "seek"; readonly seconds: number }
  | { readonly type: "unload" };

interface FakePlayer {
  readonly port: PlayerPort;
  readonly calls: PlayerCall[];
  emit(event: PlayerEvent): void;
  // The manual clock: moves the position and emits a playing progress event.
  advance(seconds: number): void;
}

interface FakePlayerOptions {
  // The duration every progress reports; 200 by default, null for an engine that reports none.
  readonly durationSeconds?: number | null;
  // When set, the fake emits ended right after the progress that reaches this position, once per load or seek.
  readonly endsAtSeconds?: number;
}

export function createFakePlayer(options: FakePlayerOptions = {}): FakePlayer {
  const calls: PlayerCall[] = [];
  const listeners = new Set<(event: PlayerEvent) => void>();
  let position = 0;
  let endEmitted = false;
  const emit = (event: PlayerEvent): void => {
    for (const listener of listeners) listener(event);
  };
  return {
    calls,
    emit,
    advance: (seconds) => {
      position += seconds;
      emit({
        type: "progress",
        positionSeconds: position,
        durationSeconds: options.durationSeconds === undefined ? 200 : options.durationSeconds,
        playing: true,
        buffering: false,
      });
      if (options.endsAtSeconds !== undefined && position >= options.endsAtSeconds && !endEmitted) {
        endEmitted = true;
        emit({ type: "ended" });
      }
    },
    port: {
      load: (url) => {
        position = 0;
        endEmitted = false;
        calls.push({ type: "load", url });
      },
      play: () => {
        calls.push({ type: "play" });
      },
      pause: () => {
        calls.push({ type: "pause" });
      },
      seek: (seconds) => {
        position = seconds;
        endEmitted = false;
        calls.push({ type: "seek", seconds });
        return Promise.resolve();
      },
      unload: () => {
        calls.push({ type: "unload" });
      },
      onEvent: (listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    },
  };
}

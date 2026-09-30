// INFO: in-memory player port with a manual clock: calls are recorded in order and a test emits events or advances the position.
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

export function createFakePlayer(): FakePlayer {
  const calls: PlayerCall[] = [];
  const listeners = new Set<(event: PlayerEvent) => void>();
  let position = 0;
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
        durationSeconds: 200,
        playing: true,
        buffering: false,
      });
    },
    port: {
      load: (url) => {
        position = 0;
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

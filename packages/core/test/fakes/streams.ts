// INFO: in-memory stream resolver: resolves a test URL per track by default, a test sets a per-track answer or holds one open.
import type { StreamResolution, StreamResolver } from "../../src/services/playback.ts";

interface FakeStreams {
  readonly resolver: StreamResolver;
  readonly calls: string[];
  answer(trackId: string, resolution: StreamResolution): void;
  // The next resolve of the track waits until the returned function settles it.
  hold(trackId: string): (resolution: StreamResolution) => void;
}

export function createFakeStreams(): FakeStreams {
  const calls: string[] = [];
  const answers = new Map<string, StreamResolution>();
  const held = new Map<string, Promise<StreamResolution>>();
  return {
    calls,
    answer: (trackId, resolution) => {
      answers.set(trackId, resolution);
    },
    hold: (trackId) => {
      let settle: (resolution: StreamResolution) => void = () => undefined;
      held.set(
        trackId,
        new Promise((resolve) => {
          settle = resolve;
        }),
      );
      return (resolution) => {
        settle(resolution);
      };
    },
    resolver: {
      resolve: (trackId) => {
        calls.push(trackId);
        const waiting = held.get(trackId);
        if (waiting !== undefined) {
          held.delete(trackId);
          return waiting;
        }
        return Promise.resolve(
          answers.get(trackId) ?? { kind: "resolved", url: `test://audio/${trackId}` },
        );
      },
    },
  };
}

// INFO: the player port: load a URL, play, pause, seek, unload and the playback events, in core's vocabulary and with no library type.
export type PlayerEvent =
  | {
      readonly type: "progress";
      readonly positionSeconds: number;
      // null while the engine does not know it yet.
      readonly durationSeconds: number | null;
      readonly playing: boolean;
      readonly buffering: boolean;
    }
  | { readonly type: "ended" }
  | { readonly type: "error"; readonly message: string };

export interface PlayerPort {
  // Replaces the current source; does not start playing.
  load(url: string): void;
  play(): void;
  pause(): void;
  // Resolves when the engine has moved; never rejects (a failure is an error event).
  seek(seconds: number): Promise<void>;
  // Stops and releases the current source.
  unload(): void;
  // Returns the unsubscribe function.
  onEvent(listener: (event: PlayerEvent) => void): () => void;
}

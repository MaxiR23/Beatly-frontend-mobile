// INFO: the player port: load a URL, play, pause, seek, unload, the lock screen info and the playback events (including the lock screen's remote next and previous), in core's vocabulary and with no library type.
// What the lock screen shows for the current track.
export interface NowPlaying {
  readonly title: string;
  readonly artists: readonly string[];
  readonly album: string | null;
  readonly artworkUrl: string | null;
  // The effective duration (the stream's, else the backend's); null leaves the engine's.
  readonly durationSeconds: number | null;
}

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
  | { readonly type: "error"; readonly message: string }
  // The lock screen's next and previous.
  | { readonly type: "remoteNext" }
  | { readonly type: "remotePrevious" };

export interface PlayerPort {
  // Replaces the current source on the same engine; does not start playing.
  load(url: string): void;
  play(): void;
  pause(): void;
  // Resolves when the engine has moved; never rejects (a failure is an error event).
  seek(seconds: number): Promise<void>;
  // Stops and releases the current source.
  unload(): void;
  // Shows the current track on the lock screen, or clears it (null). Never throws.
  setNowPlaying(info: NowPlaying | null): void;
  // Returns the unsubscribe function.
  onEvent(listener: (event: PlayerEvent) => void): () => void;
}

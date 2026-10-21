// INFO: the playback controller: the queue, the play order (shuffle), repeat one, the current track, a jump to a position of the queue, a rename of the current source, the seed of the source with its suggestions, autoplay at the end of the queue and on next at the last track, whether the source's suggestions are wanted (its last track started or the up next tab asked) and the status over the player port; an immutable snapshot plus subscribe.
import type { TrackArtistRef } from "../domain/search.ts";
import type { LogPort } from "../ports/log.ts";
import type { PlayerEvent, PlayerPort } from "../ports/player.ts";

export interface PlayableTrack {
  readonly trackId: string;
  readonly title: string;
  readonly artists: readonly TrackArtistRef[];
  // The album as POST /plays takes it; null when the screen has none, and then no play is registered.
  readonly album: string | null;
  readonly albumId: string | null;
  readonly coverUrl: string | null;
  readonly durationSeconds: number | null;
}

export interface PlaybackSource {
  // playlist is one of the caller's own; genre_playlist a curated genre playlist; liked the liked songs.
  readonly kind: "album" | "playlist" | "genre_playlist" | "liked" | "artist" | "search" | "track";
  // The album, playlist, genre playlist or artist id; "liked" for liked; the query for search; the track id whose suggestions or related songs play.
  readonly id: string;
  // The album, playlist or artist name; the query for search; the track title for track.
  readonly name: string;
}

export type StreamFailureCause = "unplayable" | "timeout" | "network" | "invalid_response";

export type StreamResolution =
  | { readonly kind: "resolved"; readonly url: string }
  | {
      readonly kind: "failure";
      readonly cause: StreamFailureCause;
      // Only an unplayable failure for a non-2xx answer carries it.
      readonly httpStatus?: number;
    };

export interface StreamResolver {
  // Never rejects: every failure, a timeout included, is a failure value.
  resolve(trackId: string): Promise<StreamResolution>;
}

export type PlaybackStatus = "idle" | "loading" | "playing" | "paused" | "failed";
export type PlaybackFailure = StreamFailureCause | "playback";

export interface PlaybackState {
  // In play order.
  readonly queue: readonly PlayableTrack[];
  // -1 when idle.
  readonly index: number;
  readonly current: PlayableTrack | null;
  readonly source: PlaybackSource | null;
  readonly status: PlaybackStatus;
  readonly failure: PlaybackFailure | null;
  // The HTTP status of an unplayable stream answer; null for every other failure and when not failed.
  readonly failureHttpStatus: number | null;
  readonly positionSeconds: number;
  readonly durationSeconds: number | null;
  readonly shuffle: boolean;
  readonly repeatOne: boolean;
  // Bumped on every track start, every repeat-one replay and when the list ends; 0 when idle. A seek keeps it.
  readonly listen: number;
  // The track the current source started on; its up next suggestions belong to the whole source. null when idle.
  readonly seed: PlayableTrack | null;
  // Bumped on every source start (a playList, or autoplay starting the suggestions); 0 when idle.
  readonly sourceStart: number;
  // True once the current source's suggestions are wanted: its last track started, or the up next tab asked; false when a source starts and when idle.
  readonly suggestionsWanted: boolean;
}

export interface PlaybackController {
  // Properties, not methods: a screen hands them to useSyncExternalStore unbound.
  getState: () => PlaybackState;
  subscribe: (listener: () => void) => () => void;
  playList(tracks: readonly PlayableTrack[], index: number, source: PlaybackSource): Promise<void>;
  toggle(): Promise<void>;
  next(): Promise<void>;
  previous(): Promise<void>;
  // Plays the track at a position of the play order (state.queue); an idle controller or a position out of range is logged and ignored.
  skipTo(position: number): Promise<void>;
  seek(seconds: number): Promise<void>;
  setShuffle(on: boolean): void;
  setRepeatOne(on: boolean): void;
  retry(): Promise<void>;
  stop(): void;
  // Renames the current source when it is this list (after an edit); the queue, the track and the status are kept, and any other source is left alone.
  renameSource(
    list: { readonly kind: PlaybackSource["kind"]; readonly id: string },
    name: string,
  ): void;
  // The suggestions of the current source, in the order the up next tab shows them; dropped unless seedTrackId is the current seed.
  setSuggestions(seedTrackId: string, tracks: readonly PlayableTrack[]): void;
  // Whether the end of the queue plays the suggestions. Off until the stored setting is applied.
  setAutoplay(on: boolean): void;
  // Marks the current source's suggestions as wanted (the up next tab is open); ignored when idle.
  wantSuggestions(): void;
}

export const PREVIOUS_RESTARTS_AFTER_SECONDS = 3;

const IDLE: PlaybackState = Object.freeze({
  queue: [],
  index: -1,
  current: null,
  source: null,
  status: "idle",
  failure: null,
  failureHttpStatus: null,
  positionSeconds: 0,
  durationSeconds: null,
  shuffle: false,
  repeatOne: false,
  listen: 0,
  seed: null,
  sourceStart: 0,
  suggestionsWanted: false,
});

export function createPlaybackController(deps: {
  player: PlayerPort;
  streams: StreamResolver;
  log: LogPort;
  // Injected so shuffle is deterministic in tests.
  random?: () => number;
}): PlaybackController {
  const { player, streams, log } = deps;
  const random = deps.random ?? Math.random;
  const listeners = new Set<() => void>();

  let state: PlaybackState = IDLE;
  // The tracks as tapped, and the play order as positions into them.
  let original: readonly PlayableTrack[] = [];
  let order: readonly number[] = [];
  // Bumped on every track start; a result of an older one is dropped.
  let generation = 0;
  // True once the engine holds the current track's source.
  let loaded = false;
  let endedGeneration = -1;
  let listens = 0;
  const nextListen = (): number => (listens += 1);
  let suggestions: readonly PlayableTrack[] = [];
  let autoplay = false;
  let sources = 0;
  const nextSource = (): number => (sources += 1);

  const update = (patch: Partial<PlaybackState>): void => {
    state = Object.freeze({ ...state, ...patch });
    for (const listener of [...listeners]) listener();
  };

  const trackAt = (position: number): PlayableTrack | null => {
    const at = order[position];
    return at === undefined ? null : (original[at] ?? null);
  };

  const shuffledOrder = (first: number): number[] => {
    const rest = original.map((_, i) => i).filter((i) => i !== first);
    for (let i = rest.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      const held = rest[i];
      const other = rest[j];
      if (held === undefined || other === undefined) continue;
      rest[i] = other;
      rest[j] = held;
    }
    return [first, ...rest];
  };

  const startAt = async (position: number): Promise<void> => {
    const track = trackAt(position);
    if (track === null) return;
    generation += 1;
    const mine = generation;
    if (loaded) player.unload();
    loaded = false;
    update({
      queue: order.map((i) => original[i]).filter((t): t is PlayableTrack => t !== undefined),
      index: position,
      current: track,
      status: "loading",
      failure: null,
      failureHttpStatus: null,
      positionSeconds: 0,
      durationSeconds: track.durationSeconds,
      listen: nextListen(),
      suggestionsWanted: state.suggestionsWanted || position === order.length - 1,
    });
    const resolution = await streams.resolve(track.trackId);
    if (mine !== generation) {
      log.debug("playback.stale_resolution", { trackId: track.trackId });
      return;
    }
    if (resolution.kind === "failure") {
      log.warn("playback.unplayable", { cause: resolution.cause, trackId: track.trackId });
      update({
        status: "failed",
        failure: resolution.cause,
        failureHttpStatus: resolution.httpStatus ?? null,
      });
      return;
    }
    player.load(resolution.url);
    loaded = true;
    player.play();
  };

  const seekTo = async (seconds: number): Promise<void> => {
    if (state.current === null || !loaded) return;
    const upper = state.durationSeconds;
    const clamped = Math.max(0, upper === null ? seconds : Math.min(seconds, upper));
    update({ positionSeconds: clamped });
    await player.seek(clamped);
  };

  const start = async (
    tracks: readonly PlayableTrack[],
    index: number,
    source: PlaybackSource,
  ): Promise<void> => {
    if (tracks.length === 0 || !Number.isInteger(index) || index < 0 || index >= tracks.length) {
      log.warn("playback.invalid_start", { length: tracks.length, index });
      return;
    }
    original = [...tracks];
    order = state.shuffle ? shuffledOrder(index) : original.map((_, i) => i);
    suggestions = [];
    update({
      source,
      seed: tracks[index] ?? null,
      sourceStart: nextSource(),
      suggestionsWanted: false,
    });
    await startAt(state.shuffle ? 0 : index);
  };

  // The end of the last track and next on it share this: with autoplay on and the source's suggestions loaded, they start as a new source under the seed's track source; false when nothing started.
  const autoplayFromLast = async (): Promise<boolean> => {
    const seed = state.seed;
    if (!autoplay || suggestions.length === 0 || seed === null) return false;
    await start(suggestions, 0, { kind: "track", id: seed.trackId, name: seed.title });
    return true;
  };

  const onEnded = async (): Promise<void> => {
    if (endedGeneration === generation) return;
    endedGeneration = generation;
    if (state.repeatOne) {
      // The replayed track can end again.
      endedGeneration = -1;
      update({ listen: nextListen() });
      await seekTo(0);
      player.play();
      update({ status: "playing" });
      return;
    }
    if (state.index < state.queue.length - 1) {
      await startAt(state.index + 1);
      return;
    }
    if (await autoplayFromLast()) return;
    player.pause();
    update({ status: "paused", positionSeconds: 0, listen: nextListen() });
    await player.seek(0);
  };

  const onEvent = (event: PlayerEvent): void => {
    if (!loaded || state.current === null) return;
    if (event.type === "progress") {
      update({
        positionSeconds: event.positionSeconds,
        durationSeconds: event.durationSeconds ?? state.durationSeconds,
        status: event.buffering ? "loading" : event.playing ? "playing" : "paused",
      });
    } else if (event.type === "error") {
      log.warn("playback.player_error", { message: event.message });
      update({ status: "failed", failure: "playback", failureHttpStatus: null });
    } else {
      void onEnded();
    }
  };
  player.onEvent(onEvent);

  const restart = async (): Promise<void> => {
    if (state.current === null) return;
    await startAt(state.index);
  };

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    playList: start,
    toggle: async () => {
      if (state.status === "playing" || state.status === "loading") {
        if (!loaded) {
          // Still resolving: cancel that start; playing again restarts the track.
          generation += 1;
        } else {
          player.pause();
        }
        update({ status: "paused" });
      } else if (state.status === "paused") {
        if (!loaded) {
          await restart();
        } else if (endedGeneration === generation) {
          // Playing after the list ended: it restarts from position 0 of the current play order.
          await startAt(0);
        } else {
          player.play();
          update({ status: "playing" });
        }
      } else if (state.status === "failed") {
        await restart();
      }
    },
    next: async () => {
      if (state.current === null) return;
      if (state.index < state.queue.length - 1) {
        await startAt(state.index + 1);
        return;
      }
      await autoplayFromLast();
    },
    previous: async () => {
      if (state.current === null) return;
      if (state.positionSeconds > PREVIOUS_RESTARTS_AFTER_SECONDS || state.index === 0) {
        await seekTo(0);
        return;
      }
      await startAt(state.index - 1);
    },
    skipTo: async (position) => {
      if (
        state.current === null ||
        !Number.isInteger(position) ||
        position < 0 ||
        position >= state.queue.length
      ) {
        log.warn("playback.invalid_skip", { length: state.queue.length, position });
        return;
      }
      await startAt(position);
    },
    seek: seekTo,
    setShuffle: (on) => {
      if (on === state.shuffle) return;
      if (state.current === null) {
        update({ shuffle: on });
        return;
      }
      const at = order[state.index] ?? 0;
      if (on) {
        order = shuffledOrder(at);
        update({
          shuffle: true,
          index: 0,
          suggestionsWanted: state.suggestionsWanted || order.length === 1,
          queue: order.map((i) => original[i]).filter((t): t is PlayableTrack => t !== undefined),
        });
      } else {
        order = original.map((_, i) => i);
        update({
          shuffle: false,
          index: at,
          queue: original,
          suggestionsWanted: state.suggestionsWanted || at === order.length - 1,
        });
      }
    },
    setRepeatOne: (on) => {
      update({ repeatOne: on });
    },
    retry: restart,
    stop: () => {
      generation += 1;
      loaded = false;
      original = [];
      order = [];
      suggestions = [];
      player.unload();
      update({ ...IDLE, shuffle: state.shuffle, repeatOne: state.repeatOne });
    },
    renameSource: (list, name) => {
      const current = state.source;
      if (current === null) return;
      if (current.kind !== list.kind || current.id !== list.id || current.name === name) return;
      update({ source: { ...current, name } });
    },
    setSuggestions: (seedTrackId, tracks) => {
      if (state.seed?.trackId !== seedTrackId) {
        log.debug("playback.stale_suggestions", { trackId: seedTrackId });
        return;
      }
      suggestions = [...tracks];
    },
    setAutoplay: (on) => {
      autoplay = on;
    },
    wantSuggestions: () => {
      if (state.seed === null || state.suggestionsWanted) return;
      update({ suggestionsWanted: true });
    },
  };
}

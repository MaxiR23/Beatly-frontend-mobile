// apps/mobile/test/adapters/player.test.ts
//
// Tests for the player adapter.
//
// Tested:
// - createPlayerAdapter over a mocked expo-audio
//
// What is covered:
// - one engine created on the first load and kept across loads, with the audio mode set for the background, the silent switch and doNotMix, and the audio session kept active
// - play, pause and seek reaching the engine
// - unload pausing and releasing the engine through remove(), never replace(null); the next load recreating it; a throwing unload as an error event and a log entry
// - a status update as a progress event (a zero duration as null), didJustFinish as ended, an engine error as an error event
// - replace receiving a { uri } AudioSource; a throwing or rejected replace as an error event and a log entry
// - the lock screen: activated on the first track with next and previous and the metadata (artist names joined with the injected separator, missing fields left out), updated on the next, cleared with null, cleared before the engine is released, a failing call logged and not emitted, nothing without an engine
// - the patched remote next and previous events as remoteNext and remotePrevious
// - a rejected seek as an error event and a log entry, a rejected audio mode as a log entry
//
// Run with: pnpm --filter @beatly/mobile test -- adapters/player
//
// SEE: apps/mobile/src/adapters/player.ts

import type { PlayerEvent } from "@beatly/core";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type * as AdapterModule from "../../src/adapters/player.ts";
import { makeLog } from "../helpers/core.tsx";

type Adapter = typeof AdapterModule;
type StatusListener = (status: Record<string, unknown>) => void;

const engine = {
  replace: jest.fn<(source: unknown) => void>(),
  play: jest.fn<() => void>(),
  pause: jest.fn<() => void>(),
  remove: jest.fn<() => void>(),
  seekTo: jest.fn<(seconds: number) => Promise<void>>(),
  addListener: jest.fn<(name: string, listener: StatusListener) => void>(),
  setActiveForLockScreen: jest.fn<(active: boolean, metadata: object, options: object) => void>(),
  updateLockScreenMetadata: jest.fn<(metadata: object) => void>(),
  clearLockScreenControls: jest.fn<() => void>(),
};
const createAudioPlayer = jest.fn<(source: unknown, options: object) => typeof engine>();
const setAudioModeAsync = jest.fn<(mode: object) => Promise<void>>();

function load(): Adapter {
  jest.resetModules();
  jest.doMock("expo-audio", () => ({ createAudioPlayer, setAudioModeAsync }));
  return jest.requireActual<Adapter>("../../src/adapters/player.ts");
}

const status = (over: Record<string, unknown> = {}) => ({
  currentTime: 12,
  duration: 200,
  playing: true,
  isBuffering: false,
  didJustFinish: false,
  error: null,
  ...over,
});

beforeEach(() => {
  for (const fn of Object.values(engine)) fn.mockReset();
  engine.seekTo.mockResolvedValue(undefined);
  createAudioPlayer.mockReset();
  createAudioPlayer.mockReturnValue(engine);
  setAudioModeAsync.mockReset();
  setAudioModeAsync.mockResolvedValue(undefined);
});

const listenerOf = (name: string): StatusListener => {
  const listener = engine.addListener.mock.calls.find(([event]) => event === name)?.[1];
  if (listener === undefined) throw new Error(`no listener for ${name}`);
  return listener;
};

const nowPlaying = {
  title: "Song",
  artists: ["A", "B"],
  album: "Album",
  artworkUrl: "test://art/large",
  durationSeconds: 137,
};

function setup() {
  const log = makeLog();
  const port = load().createPlayerAdapter({ log, artistSeparator: () => " & " });
  const events: PlayerEvent[] = [];
  port.onEvent((event) => events.push(event));
  const push = (over: Record<string, unknown> = {}) => {
    listenerOf("playbackStatusUpdate")(status(over));
  };
  const fire = (name: string) => {
    listenerOf(name)({});
  };
  return { port, log, events, push, fire };
}

describe("load", () => {
  it("creates one engine on the first load and sets the background audio mode", () => {
    const { port } = setup();
    port.load("test://audio/1");
    port.load("test://audio/2");
    expect(createAudioPlayer).toHaveBeenCalledTimes(1);
    expect(createAudioPlayer).toHaveBeenCalledWith(null, {
      updateInterval: 100,
      keepAudioSessionActive: true,
    });
    expect(setAudioModeAsync).toHaveBeenCalledWith({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
    });
    expect(engine.replace).toHaveBeenNthCalledWith(1, { uri: "test://audio/1" });
    expect(engine.replace).toHaveBeenNthCalledWith(2, { uri: "test://audio/2" });
  });

  it("passes replace an AudioSource object with the uri", () => {
    const { port } = setup();
    port.load("test://audio/1");
    expect(engine.replace).toHaveBeenCalledTimes(1);
    expect(engine.replace.mock.calls[0]?.[0]).toStrictEqual({ uri: "test://audio/1" });
  });

  it("turns a throwing replace into an error event and a log entry", () => {
    engine.replace.mockImplementationOnce(() => {
      throw new Error("cast failed");
    });
    const { port, log, events } = setup();
    port.load("test://audio/1");
    expect(events).toEqual([{ type: "error", message: "cast failed" }]);
    expect(log.warn).toHaveBeenCalledWith("player.load_failed", { message: "cast failed" });
  });

  it("turns a rejected replace into an error event and a log entry", async () => {
    engine.replace.mockImplementationOnce(() => Promise.reject(new Error("rejected")) as never);
    const { port, log, events } = setup();
    port.load("test://audio/1");
    await Promise.resolve();
    await Promise.resolve();
    expect(events).toEqual([{ type: "error", message: "rejected" }]);
    expect(log.warn).toHaveBeenCalledWith("player.load_failed", { message: "rejected" });
  });

  it("logs a rejected audio mode and keeps playing", async () => {
    setAudioModeAsync.mockRejectedValueOnce(new Error("mode down"));
    const { port, log } = setup();
    port.load("test://audio/1");
    await Promise.resolve();
    await Promise.resolve();
    expect(log.warn).toHaveBeenCalledWith("player.audio_mode_failed", { message: "mode down" });
    port.play();
    expect(engine.play).toHaveBeenCalled();
  });
});

describe("transport", () => {
  it("reaches the engine with play, pause and seek", async () => {
    const { port } = setup();
    port.load("test://audio/1");
    port.play();
    port.pause();
    await port.seek(30);
    expect(engine.play).toHaveBeenCalledTimes(1);
    expect(engine.seekTo).toHaveBeenCalledWith(30);
    expect(engine.pause).toHaveBeenCalledTimes(1);
  });

  it("turns a rejected seek into an error event and a log entry", async () => {
    engine.seekTo.mockRejectedValueOnce(new Error("seek down"));
    const { port, log, events } = setup();
    port.load("test://audio/1");
    await port.seek(5);
    expect(events).toEqual([{ type: "error", message: "seek down" }]);
    expect(log.warn).toHaveBeenCalledWith("player.seek_failed", { message: "seek down" });
  });
});

describe("unload", () => {
  it("never calls replace with null, pauses and releases the engine", () => {
    const { port } = setup();
    port.load("test://audio/1");
    port.unload();
    expect(engine.replace).toHaveBeenCalledTimes(1);
    expect(engine.replace).not.toHaveBeenCalledWith(null);
    expect(engine.pause).toHaveBeenCalledTimes(1);
    expect(engine.remove).toHaveBeenCalledTimes(1);
  });

  it("recreates the engine on the load that follows", () => {
    const { port } = setup();
    port.load("test://audio/1");
    port.unload();
    port.load("test://audio/2");
    expect(createAudioPlayer).toHaveBeenCalledTimes(2);
    expect(engine.replace).toHaveBeenLastCalledWith({ uri: "test://audio/2" });
    expect(engine.replace).not.toHaveBeenCalledWith(null);
  });

  it("does nothing without an engine", () => {
    const { port, events } = setup();
    port.unload();
    expect(engine.remove).not.toHaveBeenCalled();
    expect(events).toEqual([]);
  });

  it("turns a throwing unload into an error event and a log entry", () => {
    engine.remove.mockImplementationOnce(() => {
      throw new Error("remove failed");
    });
    const { port, log, events } = setup();
    port.load("test://audio/1");
    port.unload();
    expect(events).toEqual([{ type: "error", message: "remove failed" }]);
    expect(log.warn).toHaveBeenCalledWith("player.unload_failed", { message: "remove failed" });
  });
});

describe("status updates", () => {
  it("maps a status to a progress event with a zero duration as null", () => {
    const { port, events, push } = setup();
    port.load("test://audio/1");
    push();
    push({ duration: 0, playing: false, isBuffering: true });
    expect(events).toEqual([
      {
        type: "progress",
        positionSeconds: 12,
        durationSeconds: 200,
        playing: true,
        buffering: false,
      },
      {
        type: "progress",
        positionSeconds: 12,
        durationSeconds: null,
        playing: false,
        buffering: true,
      },
    ]);
  });

  it("maps didJustFinish to ended and an engine error to an error event", () => {
    const { port, events, push } = setup();
    port.load("test://audio/1");
    push({ didJustFinish: true });
    push({ error: "bad stream" });
    expect(events.map((e) => e.type)).toEqual(["progress", "ended", "error"]);
    expect(events[2]).toEqual({ type: "error", message: "bad stream" });
  });
});

describe("lock screen", () => {
  it("activates the lock screen on the first track with the next and previous buttons", () => {
    const { port } = setup();
    port.load("test://audio/1");
    port.setNowPlaying(nowPlaying);
    expect(engine.setActiveForLockScreen).toHaveBeenCalledWith(
      true,
      {
        title: "Song",
        artist: "A & B",
        albumTitle: "Album",
        artworkUrl: "test://art/large",
        duration: 137,
      },
      { showNextTrack: true, showPreviousTrack: true },
    );
  });

  it("updates the lock screen on the next track instead of activating it again", () => {
    const { port } = setup();
    port.load("test://audio/1");
    port.setNowPlaying(nowPlaying);
    port.setNowPlaying({ ...nowPlaying, title: "Other" });
    expect(engine.setActiveForLockScreen).toHaveBeenCalledTimes(1);
    expect(engine.updateLockScreenMetadata).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Other" }),
    );
  });

  it("leaves out the missing fields", () => {
    const { port } = setup();
    port.load("test://audio/1");
    port.setNowPlaying({
      title: "Song",
      artists: [],
      album: null,
      artworkUrl: null,
      durationSeconds: null,
    });
    expect(engine.setActiveForLockScreen.mock.calls[0]?.[1]).toStrictEqual({ title: "Song" });
  });

  it("clears the lock screen with null, and does nothing when it is not active", () => {
    const { port } = setup();
    port.load("test://audio/1");
    port.setNowPlaying(null);
    expect(engine.clearLockScreenControls).not.toHaveBeenCalled();
    port.setNowPlaying(nowPlaying);
    port.setNowPlaying(null);
    port.setNowPlaying(null);
    expect(engine.clearLockScreenControls).toHaveBeenCalledTimes(1);
    port.setNowPlaying(nowPlaying);
    expect(engine.setActiveForLockScreen).toHaveBeenCalledTimes(2);
  });

  it("does nothing without an engine", () => {
    const { port, events } = setup();
    port.setNowPlaying(nowPlaying);
    port.setNowPlaying(null);
    expect(engine.setActiveForLockScreen).not.toHaveBeenCalled();
    expect(engine.clearLockScreenControls).not.toHaveBeenCalled();
    expect(events).toEqual([]);
  });

  it("logs a failing lock screen call and emits no error", () => {
    engine.setActiveForLockScreen.mockImplementationOnce(() => {
      throw new Error("no service");
    });
    const { port, log, events } = setup();
    port.load("test://audio/1");
    port.setNowPlaying(nowPlaying);
    expect(events).toEqual([]);
    expect(log.warn).toHaveBeenCalledWith("player.lock_screen_failed", {
      message: "no service",
    });
  });

  it("clears an active lock screen on unload, before releasing the engine", () => {
    const order: string[] = [];
    engine.clearLockScreenControls.mockImplementation(() => {
      order.push("clear");
    });
    engine.remove.mockImplementation(() => {
      order.push("remove");
    });
    const { port } = setup();
    port.load("test://audio/1");
    port.setNowPlaying(nowPlaying);
    port.unload();
    expect(order).toEqual(["clear", "remove"]);
  });

  it("turns the patched remote events into remoteNext and remotePrevious", () => {
    const { port, events, fire } = setup();
    port.load("test://audio/1");
    fire("onRemoteNextTrack");
    fire("onRemotePreviousTrack");
    expect(events).toEqual([{ type: "remoteNext" }, { type: "remotePrevious" }]);
  });
});

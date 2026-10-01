// packages/core/test/services/listening.test.ts
//
// Tests for the listening counter.
//
// Tested:
// - registers a play after 30 seconds of listening, with the track's fields
// - registers nothing at 29 seconds, and once per listen however long the track keeps playing
// - does not count a seek forward or back, a jump of the engine, nor a pause
// - counts again when repeat one replays the track, and a next track as a new listen
// - registers no play for a track without album, without cover or without an artist id
// - keeps playing when the registration fails (api failure or transport failure) and logs it
// - stops counting after the returned unsubscribe
//
// What is covered:
// - with data, the typed outcomes of the registration, the controller left untouched by a failure
// - Not applicable: expected empty, the counter reads no list
//
// Run with: pnpm --filter @beatly/core test -- listening
//
// SEE: packages/core/src/services/listening.ts

import { describe, expect, it, vi } from "vitest";

import type { ActivityService } from "../../src/services/activity.ts";
import { createListeningCounter } from "../../src/services/listening.ts";
import type { PlayableTrack, PlaybackSource } from "../../src/services/playback.ts";
import { createPlaybackController } from "../../src/services/playback.ts";
import { createFakeLog } from "../fakes/log.ts";
import { createFakePlayer } from "../fakes/player.ts";
import { createFakeStreams } from "../fakes/streams.ts";

const track = (id: string, patch: Partial<PlayableTrack> = {}): PlayableTrack => ({
  trackId: id,
  title: `Song ${id}`,
  artists: [{ id: "ar1", name: "Artist" }],
  album: "Album",
  albumId: "a1",
  coverUrl: "test://img/1",
  durationSeconds: 200,
  ...patch,
});

const source: PlaybackSource = { kind: "album", id: "a1", name: "Album" };
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
const success = {
  kind: "success",
  data: { track_id: "t1", played_at: "2026-01-01T00:00:00Z" },
  maxAgeSeconds: 0,
} as const;

function progress(player: ReturnType<typeof createFakePlayer>, position: number, playing: boolean) {
  player.emit({
    type: "progress",
    positionSeconds: position,
    durationSeconds: 200,
    playing,
    buffering: false,
  });
}

function setup(answer: Awaited<ReturnType<ActivityService["logPlay"]>> = success) {
  const player = createFakePlayer();
  const streams = createFakeStreams();
  const log = createFakeLog();
  const controller = createPlaybackController({
    player: player.port,
    streams: streams.resolver,
    log: log.port,
  });
  const logPlay = vi.fn<ActivityService["logPlay"]>(() => Promise.resolve(answer));
  const off = createListeningCounter({
    playback: controller,
    activity: { logPlay },
    log: log.port,
  });
  const listen = (seconds: number) => {
    for (let i = 0; i < seconds; i += 1) player.advance(1);
  };
  return { controller, player, log, logPlay, listen, off };
}

describe("createListeningCounter", () => {
  it("registers a play after 30 seconds of listening, with the track's fields", async () => {
    const { controller, logPlay, listen } = setup();
    await controller.playList([track("t1")], 0, source);
    listen(30);
    expect(logPlay).toHaveBeenCalledTimes(1);
    expect(logPlay).toHaveBeenCalledWith({
      track_id: "t1",
      title: "Song t1",
      artists: [{ id: "ar1", name: "Artist" }],
      album: "Album",
      album_id: "a1",
      thumbnail_url: "test://img/1",
      duration_seconds: 200,
    });
  });

  it("registers nothing at 29 seconds", async () => {
    const { controller, logPlay, listen } = setup();
    await controller.playList([track("t1")], 0, source);
    listen(29);
    expect(logPlay).not.toHaveBeenCalled();
  });

  it("registers once per listen however long the track keeps playing", async () => {
    const { controller, logPlay, listen } = setup();
    await controller.playList([track("t1")], 0, source);
    listen(90);
    expect(logPlay).toHaveBeenCalledTimes(1);
  });

  it("does not count a seek forward", async () => {
    const { controller, logPlay, listen } = setup();
    await controller.playList([track("t1")], 0, source);
    listen(10);
    await controller.seek(150);
    listen(19);
    expect(logPlay).not.toHaveBeenCalled();
    listen(1);
    expect(logPlay).toHaveBeenCalledTimes(1);
  });

  it("does not count a seek back as extra listening", async () => {
    const { controller, logPlay, listen } = setup();
    await controller.playList([track("t1")], 0, source);
    listen(10);
    await controller.seek(0);
    listen(19);
    expect(logPlay).not.toHaveBeenCalled();
    listen(1);
    expect(logPlay).toHaveBeenCalledTimes(1);
  });

  it("does not count a jump emitted by the engine", async () => {
    const { controller, player, logPlay, listen } = setup();
    await controller.playList([track("t1")], 0, source);
    listen(10);
    for (let position = 70; position <= 89; position += 1) progress(player, position, true);
    expect(logPlay).not.toHaveBeenCalled();
    progress(player, 90, true);
    expect(logPlay).toHaveBeenCalledTimes(1);
  });

  it("does not count while paused", async () => {
    const { controller, player, logPlay, listen } = setup();
    await controller.playList([track("t1")], 0, source);
    listen(20);
    await controller.toggle();
    for (let position = 21; position <= 40; position += 1) progress(player, position, false);
    await controller.toggle();
    expect(logPlay).not.toHaveBeenCalled();
    for (let position = 41; position <= 49; position += 1) progress(player, position, true);
    expect(logPlay).not.toHaveBeenCalled();
    progress(player, 50, true);
    expect(logPlay).toHaveBeenCalledTimes(1);
  });

  it("counts again when repeat one replays the track", async () => {
    const { controller, player, logPlay, listen } = setup();
    await controller.playList([track("t1")], 0, source);
    controller.setRepeatOne(true);
    listen(30);
    player.emit({ type: "ended" });
    await flush();
    listen(30);
    expect(logPlay).toHaveBeenCalledTimes(2);
  });

  it("counts the next track as a new listen", async () => {
    const { controller, logPlay, listen } = setup();
    await controller.playList([track("t1"), track("t2")], 0, source);
    listen(20);
    await controller.next();
    listen(20);
    expect(logPlay).not.toHaveBeenCalled();
  });

  it("registers no play for a track without an album", async () => {
    const { controller, log, logPlay, listen } = setup();
    await controller.playList([track("t1", { album: null })], 0, source);
    listen(30);
    expect(logPlay).not.toHaveBeenCalled();
    expect(log.entries).toContainEqual({
      level: "debug",
      message: "listening.play_skipped",
      fields: { trackId: "t1", missing: "album" },
    });
  });

  it("registers no play for a track without a cover", async () => {
    const { controller, log, logPlay, listen } = setup();
    await controller.playList([track("t1", { coverUrl: null })], 0, source);
    listen(30);
    expect(logPlay).not.toHaveBeenCalled();
    expect(log.entries.at(-1)?.fields).toEqual({ trackId: "t1", missing: "thumbnail_url" });
  });

  it("sends only the artists with an id, and registers none when no artist has one", async () => {
    const withSome = setup();
    await withSome.controller.playList(
      [
        track("t1", {
          artists: [
            { id: null, name: "Nobody" },
            { id: "ar2", name: "Somebody" },
          ],
        }),
      ],
      0,
      source,
    );
    withSome.listen(30);
    expect(withSome.logPlay.mock.calls[0]?.[0].artists).toEqual([{ id: "ar2", name: "Somebody" }]);

    const withNone = setup();
    await withNone.controller.playList(
      [track("t1", { artists: [{ id: null, name: "Nobody" }] })],
      0,
      source,
    );
    withNone.listen(30);
    expect(withNone.logPlay).not.toHaveBeenCalled();
    expect(withNone.log.entries.at(-1)?.fields).toEqual({ trackId: "t1", missing: "artists" });
  });

  it("keeps playing when the registration fails with an api failure", async () => {
    const { controller, player, log, listen } = setup({
      kind: "api_failure",
      reason: "upstream_error",
    });
    await controller.playList([track("t1")], 0, source);
    listen(30);
    await flush();
    expect(controller.getState().status).toBe("playing");
    expect(player.calls.some((c) => c.type === "pause" || c.type === "unload")).toBe(false);
    listen(1);
    expect(controller.getState().positionSeconds).toBe(31);
    expect(log.entries).toContainEqual({
      level: "warn",
      message: "listening.play_failed",
      fields: { trackId: "t1", kind: "api_failure", detail: "upstream_error" },
    });
  });

  it("keeps playing when the registration fails in transport", async () => {
    const { controller, player, log, listen } = setup({
      kind: "transport_failure",
      cause: "timeout",
    });
    await controller.playList([track("t1")], 0, source);
    listen(30);
    await flush();
    expect(controller.getState().status).toBe("playing");
    expect(player.calls.some((c) => c.type === "pause" || c.type === "unload")).toBe(false);
    listen(1);
    expect(controller.getState().positionSeconds).toBe(31);
    expect(log.entries).toContainEqual({
      level: "warn",
      message: "listening.play_failed",
      fields: { trackId: "t1", kind: "transport_failure", detail: "timeout" },
    });
  });

  it("stops counting after the returned unsubscribe", async () => {
    const { controller, logPlay, listen, off } = setup();
    await controller.playList([track("t1")], 0, source);
    off();
    listen(40);
    expect(logPlay).not.toHaveBeenCalled();
  });
});

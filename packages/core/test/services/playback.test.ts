// packages/core/test/services/playback.test.ts
//
// Tests for the playback controller.
//
// Tested:
// - createPlaybackController over a fake player and a fake stream resolver
//
// What is covered:
// - with data, expected empty (an empty or out-of-range start), the typed resolution failure and the player error
// - toggle, next, previous with its restart rule, skipTo, seek, shuffle on and off, repeat one, ended at the end of the list, a stale resolution, stop
// - Not applicable: ok:false reasons, because the controller does not call the API
//
// Run with: pnpm --filter @beatly/core test -- playback
//
// SEE: packages/core/src/services/playback.ts

import { describe, expect, it } from "vitest";

import type { PlayableTrack, PlaybackSource } from "../../src/services/playback.ts";
import {
  PREVIOUS_RESTARTS_AFTER_SECONDS,
  createPlaybackController,
} from "../../src/services/playback.ts";
import { createFakeLog } from "../fakes/log.ts";
import { createFakePlayer } from "../fakes/player.ts";
import { createFakeStreams } from "../fakes/streams.ts";

const track = (id: string): PlayableTrack => ({
  trackId: id,
  title: `Song ${id}`,
  artists: ["Artist"],
  coverUrl: null,
  durationSeconds: 200,
});

const list = ["t1", "t2", "t3"].map(track);
const source: PlaybackSource = { kind: "album", id: "a1", name: "Album" };
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function setup(random?: () => number) {
  const player = createFakePlayer();
  const streams = createFakeStreams();
  const log = createFakeLog();
  const controller = createPlaybackController({
    player: player.port,
    streams: streams.resolver,
    log: log.port,
    ...(random === undefined ? {} : { random }),
  });
  return { controller, player, streams, log };
}

const loads = (calls: { type: string; url?: string }[]) =>
  calls.filter((c) => c.type === "load").map((c) => c.url);

describe("playList", () => {
  it("plays the tapped track of a list and continues to the next one when it ends", async () => {
    const { controller, player } = setup();
    await controller.playList(list, 1, source);
    player.advance(1);
    const state = controller.getState();
    expect(state.current?.trackId).toBe("t2");
    expect(state.index).toBe(1);
    expect(state.source).toEqual(source);
    expect(state.status).toBe("playing");
    expect(player.calls).toEqual([{ type: "load", url: "test://audio/t2" }, { type: "play" }]);
    player.emit({ type: "ended" });
    await flush();
    expect(loads(player.calls)).toEqual(["test://audio/t2", "test://audio/t3"]);
    expect(controller.getState().current?.trackId).toBe("t3");
  });

  it("stays idle and logs when started with an empty list", async () => {
    const { controller, player, streams, log } = setup();
    await controller.playList([], 0, source);
    expect(controller.getState().status).toBe("idle");
    expect(controller.getState().current).toBeNull();
    expect(streams.calls).toEqual([]);
    expect(player.calls).toEqual([]);
    expect(log.entries.map((e) => [e.level, e.message])).toEqual([
      ["warn", "playback.invalid_start"],
    ]);
  });

  it("stays idle when the start index is out of range", async () => {
    const { controller, player, streams } = setup();
    await controller.playList(list, 3, source);
    expect(controller.getState().status).toBe("idle");
    expect(streams.calls).toEqual([]);
    expect(player.calls).toEqual([]);
  });

  it("draws a resolution failure as failed with its cause and does not skip", async () => {
    const { controller, player, streams, log } = setup();
    streams.answer("t1", { kind: "failure", cause: "unplayable" });
    await controller.playList(list, 0, source);
    const state = controller.getState();
    expect(state.status).toBe("failed");
    expect(state.failure).toBe("unplayable");
    expect(state.index).toBe(0);
    expect(loads(player.calls)).toEqual([]);
    expect(log.entries.some((e) => e.level === "warn" && e.fields?.cause === "unplayable")).toBe(
      true,
    );
  });

  it("keeps a timeout or network resolution failure as its cause", async () => {
    const { controller, streams } = setup();
    streams.answer("t1", { kind: "failure", cause: "timeout" });
    await controller.playList(list, 0, source);
    expect(controller.getState().failure).toBe("timeout");
    streams.answer("t1", { kind: "failure", cause: "network" });
    await controller.retry();
    expect(controller.getState().failure).toBe("network");
  });

  it("turns a player error event into a playback failure", async () => {
    const { controller, player, log } = setup();
    await controller.playList(list, 0, source);
    player.emit({ type: "error", message: "boom" });
    expect(controller.getState().status).toBe("failed");
    expect(controller.getState().failure).toBe("playback");
    expect(log.entries.at(-1)?.message).toBe("playback.player_error");
  });

  it("drops a resolution that a later tap overtook", async () => {
    const { controller, player, streams } = setup();
    const settle = streams.hold("t1");
    const first = controller.playList(list, 0, source);
    await controller.playList(list, 1, source);
    settle({ kind: "resolved", url: "test://audio/t1" });
    await first;
    expect(loads(player.calls)).toEqual(["test://audio/t2"]);
    expect(controller.getState().current?.trackId).toBe("t2");
  });
});

describe("starting while another track is loaded", () => {
  it("unloads the previous track before the next one resolves, so pause leaves nothing playing", async () => {
    const { controller, player, streams } = setup();
    await controller.playList(list, 0, source);
    player.advance(1);
    const settle = streams.hold("t2");
    const pending = controller.next();
    expect(player.calls.at(-1)).toEqual({ type: "unload" });
    await controller.toggle();
    expect(controller.getState().status).toBe("paused");
    settle({ kind: "resolved", url: "test://audio/t2" });
    await pending;
    expect(loads(player.calls)).toEqual(["test://audio/t1"]);
    expect(player.calls.filter((c) => c.type === "play")).toHaveLength(1);
  });

  it("has unloaded the previous track when the next resolution fails", async () => {
    const { controller, player, streams } = setup();
    await controller.playList(list, 0, source);
    streams.answer("t2", { kind: "failure", cause: "unplayable" });
    await controller.next();
    expect(controller.getState().status).toBe("failed");
    expect(player.calls.at(-1)).toEqual({ type: "unload" });
  });
});

describe("toggle", () => {
  it("pauses while playing and plays while paused", async () => {
    const { controller, player } = setup();
    await controller.playList(list, 0, source);
    player.advance(1);
    await controller.toggle();
    expect(controller.getState().status).toBe("paused");
    await controller.toggle();
    expect(controller.getState().status).toBe("playing");
    expect(player.calls.map((c) => c.type)).toEqual(["load", "play", "pause", "play"]);
  });

  it("retries a failed track on toggle", async () => {
    const { controller, player, streams } = setup();
    streams.answer("t1", { kind: "failure", cause: "network" });
    await controller.playList(list, 0, source);
    streams.answer("t1", { kind: "resolved", url: "test://audio/t1" });
    await controller.toggle();
    expect(loads(player.calls)).toEqual(["test://audio/t1"]);
    expect(controller.getState().failure).toBeNull();
  });

  it("does nothing on toggle when idle", async () => {
    const { controller, player } = setup();
    await controller.toggle();
    expect(controller.getState().status).toBe("idle");
    expect(player.calls).toEqual([]);
  });
});

describe("next and previous", () => {
  it("goes to the next track even with repeat one on", async () => {
    const { controller } = setup();
    await controller.playList(list, 0, source);
    controller.setRepeatOne(true);
    await controller.next();
    expect(controller.getState().current?.trackId).toBe("t2");
  });

  it("does nothing on next at the last track", async () => {
    const { controller, player } = setup();
    await controller.playList(list, 2, source);
    const before = player.calls.length;
    await controller.next();
    expect(controller.getState().current?.trackId).toBe("t3");
    expect(player.calls.length).toBe(before);
  });

  it("restarts the track on previous after three seconds", async () => {
    const { controller, player } = setup();
    await controller.playList(list, 1, source);
    player.advance(PREVIOUS_RESTARTS_AFTER_SECONDS + 1);
    await controller.previous();
    expect(controller.getState().current?.trackId).toBe("t2");
    expect(player.calls.at(-1)).toEqual({ type: "seek", seconds: 0 });
  });

  it("goes to the previous track within the first three seconds", async () => {
    const { controller, player } = setup();
    await controller.playList(list, 1, source);
    player.advance(1);
    await controller.previous();
    expect(controller.getState().current?.trackId).toBe("t1");
  });

  it("restarts the first track on previous", async () => {
    const { controller, player } = setup();
    await controller.playList(list, 0, source);
    player.advance(1);
    await controller.previous();
    expect(controller.getState().current?.trackId).toBe("t1");
    expect(player.calls.at(-1)).toEqual({ type: "seek", seconds: 0 });
  });
});

describe("skipTo", () => {
  const five = ["t1", "t2", "t3", "t4", "t5"].map(track);

  it("plays the track at a position of the queue", async () => {
    const { controller, player } = setup();
    await controller.playList(list, 0, source);
    await controller.skipTo(2);
    expect(controller.getState().current?.trackId).toBe("t3");
    expect(controller.getState().index).toBe(2);
    expect(controller.getState().source).toEqual(source);
    expect(loads(player.calls).at(-1)).toBe("test://audio/t3");
  });

  it("keeps the shuffled order and jumps in play order", async () => {
    const { controller } = setup(() => 0);
    controller.setShuffle(true);
    await controller.playList(five, 2, source);
    const before = controller.getState().queue.map((t) => t.trackId);
    await controller.skipTo(3);
    expect(controller.getState().queue.map((t) => t.trackId)).toEqual(before);
    expect(controller.getState().index).toBe(3);
    expect(controller.getState().current?.trackId).toBe(before[3]);
  });

  it("logs and ignores a position out of range", async () => {
    const { controller, log } = setup();
    await controller.playList(list, 0, source);
    await controller.skipTo(3);
    await controller.skipTo(-1);
    expect(controller.getState().index).toBe(0);
    expect(log.entries.filter((e) => e.message === "playback.invalid_skip")).toHaveLength(2);
  });

  it("does nothing while idle", async () => {
    const { controller, player, log } = setup();
    await controller.skipTo(0);
    expect(controller.getState().status).toBe("idle");
    expect(player.calls).toEqual([]);
    expect(log.entries.map((e) => e.message)).toEqual(["playback.invalid_skip"]);
  });
});

describe("seek", () => {
  it("clamps a seek to the duration and moves the position at once", async () => {
    const { controller, player } = setup();
    await controller.playList(list, 0, source);
    player.advance(1);
    const pending = controller.seek(999);
    expect(controller.getState().positionSeconds).toBe(200);
    await pending;
    expect(player.calls.at(-1)).toEqual({ type: "seek", seconds: 200 });
    await controller.seek(-5);
    expect(controller.getState().positionSeconds).toBe(0);
  });
});

describe("shuffle", () => {
  const five = ["t1", "t2", "t3", "t4", "t5"].map(track);
  const ids = (c: ReturnType<typeof setup>["controller"]) =>
    c.getState().queue.map((t) => t.trackId);

  it("keeps the current track first when shuffle turns on", async () => {
    const { controller } = setup(() => 0);
    await controller.playList(five, 2, source);
    controller.setShuffle(true);
    expect(controller.getState().index).toBe(0);
    expect(controller.getState().current?.trackId).toBe("t3");
    expect(ids(controller)).toEqual(["t3", "t2", "t4", "t5", "t1"]);
  });

  it("restores the original order at the current track when shuffle turns off", async () => {
    const { controller } = setup(() => 0);
    await controller.playList(five, 2, source);
    controller.setShuffle(true);
    controller.setShuffle(false);
    expect(ids(controller)).toEqual(["t1", "t2", "t3", "t4", "t5"]);
    expect(controller.getState().index).toBe(2);
    expect(controller.getState().current?.trackId).toBe("t3");
  });

  it("restores the right position when the list holds the same track twice", async () => {
    const { controller } = setup(() => 0);
    const twice = [track("t1"), track("t2"), track("t1")];
    await controller.playList(twice, 2, source);
    controller.setShuffle(true);
    controller.setShuffle(false);
    expect(controller.getState().index).toBe(2);
  });

  it("starts a list shuffled from the tapped track when shuffle is on", async () => {
    const { controller, player } = setup(() => 0);
    controller.setShuffle(true);
    await controller.playList(five, 3, source);
    expect(controller.getState().current?.trackId).toBe("t4");
    expect(controller.getState().index).toBe(0);
    expect(loads(player.calls)).toEqual(["test://audio/t4"]);
  });
});

describe("ended", () => {
  it("replays the track when it ends with repeat one on", async () => {
    const { controller, player } = setup();
    await controller.playList(list, 0, source);
    player.advance(1);
    controller.setRepeatOne(true);
    player.emit({ type: "ended" });
    await flush();
    expect(controller.getState().current?.trackId).toBe("t1");
    expect(player.calls.slice(-2)).toEqual([{ type: "seek", seconds: 0 }, { type: "play" }]);
  });

  it("pauses at the start of the last track when the list ends", async () => {
    const { controller, player } = setup();
    await controller.playList(list, 2, source);
    player.advance(5);
    player.emit({ type: "ended" });
    await flush();
    const state = controller.getState();
    expect(state.current?.trackId).toBe("t3");
    expect(state.status).toBe("paused");
    expect(state.positionSeconds).toBe(0);
  });

  it("handles ended once per track", async () => {
    const { controller, player } = setup();
    await controller.playList(list, 0, source);
    player.emit({ type: "ended" });
    player.emit({ type: "ended" });
    await flush();
    expect(loads(player.calls)).toEqual(["test://audio/t1", "test://audio/t2"]);
  });
});

describe("ended again after the list ended", () => {
  const endLastAndPlayAgain = async () => {
    const ctx = setup();
    await ctx.controller.playList([track("t1")], 0, source);
    ctx.player.advance(5);
    ctx.player.emit({ type: "ended" });
    await flush();
    await ctx.controller.toggle();
    ctx.player.advance(5);
    return ctx;
  };

  it("pauses at position 0 and seeks 0 again", async () => {
    const { controller, player } = await endLastAndPlayAgain();
    player.emit({ type: "ended" });
    await flush();
    expect(controller.getState().status).toBe("paused");
    expect(controller.getState().positionSeconds).toBe(0);
    expect(player.calls.filter((c) => c.type === "seek")).toHaveLength(2);
  });

  it("replays with repeat one on", async () => {
    const { controller, player } = await endLastAndPlayAgain();
    controller.setRepeatOne(true);
    player.emit({ type: "ended" });
    await flush();
    expect(controller.getState().status).toBe("playing");
    expect(player.calls.slice(-2)).toEqual([{ type: "seek", seconds: 0 }, { type: "play" }]);
  });
});

describe("state", () => {
  it("returns the same snapshot until something changes and notifies subscribers", async () => {
    const { controller } = setup();
    let notified = 0;
    const off = controller.subscribe(() => {
      notified += 1;
    });
    const first = controller.getState();
    expect(controller.getState()).toBe(first);
    await controller.playList(list, 0, source);
    expect(controller.getState()).not.toBe(first);
    expect(notified).toBeGreaterThan(0);
    off();
    const seen = notified;
    controller.setRepeatOne(true);
    expect(notified).toBe(seen);
  });

  it("keeps the current track object across progress events", async () => {
    const { controller, player } = setup();
    await controller.playList(list, 0, source);
    const current = controller.getState().current;
    player.advance(1);
    player.advance(1);
    expect(controller.getState().current).toBe(current);
  });

  it("unloads and returns to idle on stop", async () => {
    const { controller, player } = setup();
    controller.setShuffle(true);
    await controller.playList(list, 0, source);
    controller.stop();
    const state = controller.getState();
    expect(state.status).toBe("idle");
    expect(state.current).toBeNull();
    expect(state.index).toBe(-1);
    expect(state.shuffle).toBe(true);
    expect(player.calls.at(-1)).toEqual({ type: "unload" });
  });
});

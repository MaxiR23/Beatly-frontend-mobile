// apps/mobile/test/screens/player/useNowPlaying.test.tsx
//
// Tests for the now playing hooks.
//
// Tested:
// - nowPlayingOf, listPlaybackOf
// - useNowPlaying, useListPlayback
//
// What is covered:
// - the status mappings of a row and of a list's play button
// - nothing marked and the list idle while nothing plays; the current track playing while it loads and plays, paused after a pause and after a failed stream, no other track marked
// - a track marked by id wherever it appears; a list loading, playing or paused only when it is the source, idle for another source or without an id
// - the reduce motion setting passed on
//
// Run with: pnpm --filter @beatly/mobile test -- useNowPlaying
//
// SEE: apps/mobile/src/screens/player/useNowPlaying.ts

import type { PlayableTrack, PlaybackSource } from "@beatly/core";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { AccessibilityInfo } from "react-native";

import {
  listPlaybackOf,
  nowPlayingOf,
  useListPlayback,
  useNowPlaying,
} from "../../../src/screens/player/useNowPlaying.ts";
import { makeCore, Wrapper } from "../../helpers/core.tsx";

const reduce = jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled");

afterEach(() => {
  reduce.mockReset().mockResolvedValue(false);
});

const track = (id: string): PlayableTrack => ({
  trackId: id,
  title: `Song ${id}`,
  artists: [],
  album: null,
  albumId: null,
  coverUrl: null,
  durationSeconds: 100,
});
const source: PlaybackSource = { kind: "album", id: "a1", name: "Album" };

function setup(options: Parameters<typeof makeCore>[0] = {}) {
  const ctx = makeCore(options);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Wrapper core={ctx.core}>{children}</Wrapper>
  );
  return { ctx, wrapper };
}

const playing = (ctx: ReturnType<typeof makeCore>) =>
  act(() => {
    ctx.player.emit({
      type: "progress",
      playing: true,
      buffering: false,
      positionSeconds: 1,
      durationSeconds: 100,
    });
  });

describe("status mappings", () => {
  it("maps a status to the row mark", () => {
    expect(nowPlayingOf("loading")).toBe("playing");
    expect(nowPlayingOf("playing")).toBe("playing");
    expect(nowPlayingOf("paused")).toBe("paused");
    expect(nowPlayingOf("failed")).toBe("paused");
    expect(nowPlayingOf("idle")).toBeUndefined();
  });

  it("maps a status to the list button, idle for another source", () => {
    expect(listPlaybackOf("loading", true)).toBe("loading");
    expect(listPlaybackOf("playing", true)).toBe("playing");
    expect(listPlaybackOf("paused", true)).toBe("paused");
    expect(listPlaybackOf("failed", true)).toBe("paused");
    expect(listPlaybackOf("idle", true)).toBe("idle");
    for (const status of ["loading", "playing", "paused", "failed", "idle"] as const) {
      expect(listPlaybackOf(status, false)).toBe("idle");
    }
  });
});

describe("useNowPlaying", () => {
  it("marks nothing and draws the list idle while nothing plays", async () => {
    const { wrapper } = setup();
    const { result } = await renderHook(
      () => ({ now: useNowPlaying(), list: useListPlayback("album", "a1") }),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.now.reduceMotion).toBe(false);
    });
    expect(result.current.now.of("t1")).toBeUndefined();
    expect(result.current.list).toBe("idle");
  });

  it("marks the current track playing while it loads and plays, and no other track", async () => {
    const { ctx, wrapper } = setup();
    const { result } = await renderHook(() => useNowPlaying(), { wrapper });
    await act(async () => {
      await ctx.playback.playList([track("t1"), track("t2")], 0, source);
    });
    expect(result.current.of("t1")).toBe("playing");
    expect(result.current.of("t2")).toBeUndefined();
    expect(result.current.of(null)).toBeUndefined();
    await playing(ctx);
    expect(result.current.of("t1")).toBe("playing");
    expect(result.current.of("t2")).toBeUndefined();
  });

  it("marks it paused after a pause and after a failed stream", async () => {
    const { ctx, wrapper } = setup();
    const { result } = await renderHook(() => useNowPlaying(), { wrapper });
    await act(async () => {
      await ctx.playback.playList([track("t1")], 0, source);
    });
    await playing(ctx);
    await act(async () => {
      await ctx.playback.toggle();
    });
    expect(result.current.of("t1")).toBe("paused");
    const failing = setup({
      resolve: () => Promise.resolve({ kind: "failure", cause: "unplayable" }),
    });
    const failed = await renderHook(() => useNowPlaying(), { wrapper: failing.wrapper });
    await act(async () => {
      await failing.ctx.playback.playList([track("t9")], 0, source);
    });
    expect(failed.result.current.of("t9")).toBe("paused");
  });

  it("marks a track by id wherever it appears", async () => {
    const { ctx, wrapper } = setup();
    const { result } = await renderHook(() => useNowPlaying(), { wrapper });
    await act(async () => {
      await ctx.playback.playList([track("t1"), track("t2"), track("t1")], 0, source);
    });
    const first = result.current.of("t1");
    const second = result.current.of("t1");
    expect(first).toBe("playing");
    expect(second).toBe("playing");
  });

  it("passes the reduce motion setting", async () => {
    reduce.mockResolvedValue(true);
    const { wrapper } = setup();
    const { result } = await renderHook(() => useNowPlaying(), { wrapper });
    await waitFor(() => {
      expect(result.current.reduceMotion).toBe(true);
    });
  });
});

describe("useListPlayback", () => {
  it("draws the list loading, playing and paused only when it is the source, idle for another source", async () => {
    const { ctx, wrapper } = setup();
    const { result } = await renderHook(
      () => ({
        album: useListPlayback("album", "a1"),
        other: useListPlayback("album", "a2"),
        playlist: useListPlayback("playlist", "a1"),
      }),
      { wrapper },
    );
    let release: () => void = () => undefined;
    const slow = setup({
      resolve: () =>
        new Promise((resolve) => {
          release = () => {
            resolve({ kind: "resolved", url: "test://audio/t1" });
          };
        }),
    });
    const slowHook = await renderHook(() => useListPlayback("album", "a1"), {
      wrapper: slow.wrapper,
    });
    await act(() => {
      void slow.ctx.playback.playList([track("t1")], 0, source);
    });
    expect(slowHook.result.current).toBe("loading");
    await act(() => {
      release();
    });
    await playing(slow.ctx);
    expect(slowHook.result.current).toBe("playing");

    await act(async () => {
      await ctx.playback.playList([track("t1")], 0, source);
    });
    await playing(ctx);
    expect(result.current).toEqual({ album: "playing", other: "idle", playlist: "idle" });
    await act(async () => {
      await ctx.playback.toggle();
    });
    expect(result.current).toEqual({ album: "paused", other: "idle", playlist: "idle" });
  });

  it("is idle without an id", async () => {
    const { ctx, wrapper } = setup();
    const { result } = await renderHook(() => useListPlayback("album", null), { wrapper });
    await act(async () => {
      await ctx.playback.playList([track("t1")], 0, source);
    });
    expect(result.current).toBe("idle");
  });
});

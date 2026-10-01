// apps/mobile/test/screens/player/PlayerScreen.test.tsx
//
// Tests for the player screen.
//
// Tested:
// - PlayerScreen
//
// What is covered:
// - the source, title, artists and the elapsed and remaining times, a search source and a track source drawn as their own label
// - play or pause, next, previous, shuffle, repeat one and the seek bar reaching the controller
// - the spec's layout: header, full-width cover, gaps, controls row, the wash to the base surface by the middle, the transport icon sizes
// - the empty state, the resolution failure with retry, loading, close and its fallback, es
// - the platform split of the close button, the drag down closing, the scroll gate of the drag
// - the cover shrinking while paused and springing back, reduce motion keeping the cover and the player still
//
// Run with: pnpm --filter @beatly/mobile test -- PlayerScreen
//
// SEE: apps/mobile/src/screens/player/PlayerScreen.tsx

import type { PlayableTrack, PlaybackSource } from "@beatly/core";
import { color, icon, layout, motion, radius, spacing } from "@beatly/ui";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import {
  AccessibilityInfo,
  Animated,
  Dimensions,
  Platform,
  processColor,
  StyleSheet,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { i18n } from "../../../src/adapters/i18n.ts";
import { resources } from "../../../src/i18n/resources.ts";
import { PlayerScreen } from "../../../src/screens/player/PlayerScreen.tsx";
import { makeCore, stateFlag, Wrapper } from "../../helpers/core.tsx";

const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace, canGoBack: () => mockCanGoBack }),
}));
const mockPeek: { current: unknown } = { current: undefined };
jest.mock("../../../src/adapters/imageColors.ts", () => ({
  getDominantColor: () => Promise.resolve({ kind: "unavailable" }),
  peekDominantColor: () => mockPeek.current,
}));

const spring = jest.spyOn(Animated, "spring");
const reduce = jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled");

afterEach(async () => {
  Platform.OS = "ios";
  spring.mockClear();
  reduce.mockClear().mockResolvedValue(false);
  mockPeek.current = undefined;
  mockBack.mockClear();
  mockReplace.mockClear();
  mockCanGoBack = true;
  await i18n.changeLanguage("en");
});

const en = resources.en;
const es = resources.es;
const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const track = (id: string, coverUrl: string | null = null): PlayableTrack => ({
  trackId: id,
  title: `Song ${id}`,
  artists: ["Ann", "Bob"],
  coverUrl,
  durationSeconds: 248,
});
const album: PlaybackSource = { kind: "album", id: "a1", name: "Test Album" };

async function setup(options: Parameters<typeof makeCore>[0] = {}) {
  const ctx = makeCore(options);
  await render(
    <Wrapper core={ctx.core}>
      <SafeAreaProvider initialMetrics={metrics}>
        <PlayerScreen />
      </SafeAreaProvider>
    </Wrapper>,
  );
  return ctx;
}

type Ctx = Awaited<ReturnType<typeof setup>>;

async function start(ctx: Ctx, source: PlaybackSource = album) {
  await act(async () => {
    await ctx.playback.playList([track("1"), track("2")], 0, source);
  });
}

const progress = (ctx: Ctx, position: number, playing = true) =>
  act(() => {
    ctx.player.emit({
      type: "progress",
      positionSeconds: position,
      durationSeconds: 248,
      playing,
      buffering: false,
    });
  });

// A single-touch history the PanResponder reads: the finger moved from `from` to `to` (page y) and the
// move ended at time `t`, `dt` ms after the previous one.
const touch = (from: number, to: number, t: number, dt = 16) => ({
  nativeEvent: { touches: [{}] },
  touchHistory: {
    numberActiveTouches: 1,
    indexOfSingleActiveTouch: 0,
    mostRecentTimeStamp: t,
    touchBank: [
      {
        touchActive: true,
        startPageX: 0,
        startPageY: from,
        startTimeStamp: t - dt,
        currentPageX: 0,
        currentPageY: to,
        currentTimeStamp: t,
        previousPageX: 0,
        previousPageY: from,
        previousTimeStamp: t - dt,
      },
    ],
  },
});

// Calls a responder prop of the drag container.
function call(name: string, event: unknown): unknown {
  const handler: unknown = screen.getByTestId("player-drag").props[name];
  if (typeof handler !== "function") throw new Error(`no ${name}`);
  return (handler as (event: unknown) => unknown)(event);
}

interface JsonNode {
  props: Record<string, unknown>;
  children: unknown;
}

function isJsonNode(value: unknown): value is JsonNode {
  return typeof value === "object" && value !== null && "props" in value;
}

// Collects, from the rendered tree, every node whose props include the given key.
function nodesWithProp(tree: unknown, key: string): JsonNode[] {
  const found: JsonNode[] = [];
  const visit = (node: unknown) => {
    if (Array.isArray(node)) node.forEach(visit);
    if (!isJsonNode(node)) return;
    if (key in node.props) found.push(node);
    visit(node.children);
  };
  visit(tree);
  return found;
}

// The icon glyph (svg root) with the given lucide class, as drawn now.
function glyph(name: string): JsonNode | undefined {
  return nodesWithProp(screen.toJSON(), "xmlns").find((node) =>
    String(node.props.className).includes(`lucide-${name}`),
  );
}

// The svg renderer stores the gradient as [offset, color, ...] with signed ARGB colors.
const argb = (value: string) => Number(processColor(value)) | 0;

describe("PlayerScreen", () => {
  it("draws the source, the title, the artists and the times", async () => {
    const ctx = await setup();
    await start(ctx);
    await progress(ctx, 30);
    expect(screen.getByText(en.player.playingFrom)).toBeTruthy();
    expect(screen.getByText("Test Album")).toBeTruthy();
    expect(screen.getByText("Song 1")).toBeTruthy();
    expect(screen.getByText("Ann, Bob")).toBeTruthy();
    expect(screen.getByText("0:30")).toBeTruthy();
    expect(screen.getByText("-3:38")).toBeTruthy();
  });

  it("lays out the header, the full-width cover and the spec's gaps", async () => {
    const ctx = await setup();
    await start(ctx);
    await progress(ctx, 30);
    expect(screen.getByTestId("player-header")).toHaveStyle({
      height: layout.controlHeight,
      paddingHorizontal: spacing.xl,
    });
    expect(screen.getByTestId("player-cover")).toHaveStyle({ marginTop: spacing.xl });
    const box = screen.getByTestId("cover-placeholder").parent;
    const side = Dimensions.get("window").width - 2 * spacing.xl;
    expect(StyleSheet.flatten(box?.props.style)).toEqual(
      expect.objectContaining({ width: side, height: side, borderRadius: radius.md }),
    );
    expect(screen.getByTestId("player-titles")).toHaveStyle({ marginTop: spacing.xxl });
    expect(screen.getByTestId("player-seek")).toHaveStyle({ marginTop: spacing.xl });
    expect(screen.getByTestId("player-controls")).toHaveStyle({
      marginTop: spacing.lg,
      justifyContent: "space-between",
    });
  });

  it("puts the controls xl below the titles while the seek bar is not drawn", async () => {
    const ctx = await setup({ resolve: () => new Promise(() => undefined) });
    await act(() => {
      void ctx.playback.playList([{ ...track("1"), durationSeconds: null }], 0, album);
    });
    expect(screen.queryByTestId("player-seek")).toBeNull();
    expect(screen.getByTestId("player-controls")).toHaveStyle({ marginTop: spacing.xl });
  });

  it("draws the wash from the dominant color to the base surface by the middle", async () => {
    mockPeek.current = { kind: "color", value: "#336699" };
    const ctx = await setup();
    await act(async () => {
      await ctx.playback.playList([track("1", "test://cover/1")], 0, album);
    });
    expect(screen.getByTestId("player-wash")).toBeTruthy();
    const [gradient] = nodesWithProp(screen.toJSON(), "gradient");
    expect(gradient?.props.gradient).toEqual([
      0,
      argb("#336699"),
      0.5,
      argb(color.surface.base),
      1,
      argb(color.surface.base),
    ]);
  });

  it("draws the transport icons at the spec's sizes", async () => {
    Platform.OS = "android";
    const ctx = await setup();
    await start(ctx);
    for (const name of ["skip-back", "skip-forward"]) {
      expect(glyph(name)?.props).toMatchObject({
        width: icon.size.xl,
        fill: color.text.primary,
      });
    }
    for (const name of ["shuffle", "repeat-1"]) {
      expect(glyph(name)?.props).toMatchObject({
        width: icon.size.md,
        fill: "none",
        stroke: color.text.secondary,
      });
    }
    expect(glyph("chevron-down")?.props.width).toBe(icon.size.lg);
  });

  it("draws a search source as its own label", async () => {
    const ctx = await setup();
    await start(ctx, { kind: "search", id: "moon", name: "moon" });
    expect(screen.getByText("Search “moon”")).toBeTruthy();
  });

  it("draws a track source as its own label", async () => {
    const ctx = await setup();
    await start(ctx, { kind: "track", id: "1", name: "Song 1" });
    expect(screen.getByText("Songs like “Song 1”")).toBeTruthy();
  });

  it("pauses and plays from the large button", async () => {
    const ctx = await setup();
    await start(ctx);
    await progress(ctx, 1);
    await fireEvent.press(screen.getByRole("button", { name: en.player.pause }));
    expect(ctx.playback.getState().status).toBe("paused");
    await fireEvent.press(screen.getByRole("button", { name: en.player.play }));
    expect(ctx.playback.getState().status).toBe("playing");
  });

  it("goes to the next track and back to the previous one", async () => {
    const ctx = await setup();
    await start(ctx);
    await fireEvent.press(screen.getByRole("button", { name: en.player.next }));
    expect(ctx.playback.getState().current?.trackId).toBe("2");
    await fireEvent.press(screen.getByRole("button", { name: en.player.previous }));
    expect(ctx.playback.getState().current?.trackId).toBe("1");
  });

  it("toggles shuffle and repeat one with their selected state", async () => {
    const ctx = await setup();
    await start(ctx);
    const shuffle = () => screen.getByRole("button", { name: en.player.shuffle });
    const repeat = () => screen.getByRole("button", { name: en.player.repeatOne });
    expect(stateFlag(shuffle(), "selected")).toBe(false);
    await fireEvent.press(shuffle());
    await fireEvent.press(repeat());
    expect(ctx.playback.getState().shuffle).toBe(true);
    expect(ctx.playback.getState().repeatOne).toBe(true);
    expect(stateFlag(shuffle(), "selected")).toBe(true);
    expect(stateFlag(repeat(), "selected")).toBe(true);
  });

  it("seeks the player from the seek bar", async () => {
    const ctx = await setup();
    await start(ctx);
    await progress(ctx, 1);
    const touch = screen.getByTestId("seek-touch");
    await fireEvent(touch, "layout", { nativeEvent: { layout: { width: 200, height: 48 } } });
    await fireEvent(touch, "responderRelease", { nativeEvent: { locationX: 100 } });
    expect(ctx.player.port.seek).toHaveBeenCalledWith(124);
  });

  it("draws the empty state with the close button when nothing is loaded on Android", async () => {
    Platform.OS = "android";
    await setup();
    expect(screen.getByText(en.player.empty)).toBeTruthy();
    expect(screen.getByRole("button", { name: en.player.close })).toBeTruthy();
  });

  it("draws the error with retry on a resolution failure and retry asks the resolver again", async () => {
    const ctx = await setup({
      resolve: () => Promise.resolve({ kind: "failure", cause: "unplayable" }),
    });
    await start(ctx);
    expect(screen.getByText(en.player.error.unplayable)).toBeTruthy();
    expect(screen.getByText("Song 1")).toBeTruthy();
    expect(screen.queryByTestId("seek-touch")).toBeNull();
    const before = ctx.resolve.mock.calls.length;
    await fireEvent.press(screen.getByRole("button", { name: en.common.retry }));
    expect(ctx.resolve.mock.calls.length).toBe(before + 1);
  });

  it("spins the play button while the track loads", async () => {
    const ctx = await setup({ resolve: () => new Promise(() => undefined) });
    await act(() => {
      void ctx.playback.playList([track("1")], 0, album);
    });
    const button = screen.getByRole("button", { name: en.player.play });
    expect(stateFlag(button, "busy")).toBe(true);
  });

  it("closes, or replaces with / when there is nothing to go back to on Android", async () => {
    Platform.OS = "android";
    const ctx = await setup();
    await start(ctx);
    await fireEvent.press(screen.getByRole("button", { name: en.player.close }));
    expect(mockBack).toHaveBeenCalledTimes(1);
    mockCanGoBack = false;
    await fireEvent.press(screen.getByRole("button", { name: en.player.close }));
    expect(mockReplace).toHaveBeenCalledWith("/");
  });

  it("draws no close button on iOS, empty or loaded", async () => {
    const ctx = await setup();
    const close = { name: en.player.close };
    expect(screen.queryByRole("button", close)).toBeNull();
    expect(screen.getByTestId("player-header")).toHaveStyle({ height: layout.controlHeight });
    await start(ctx);
    expect(screen.queryByRole("button", close)).toBeNull();
    expect(screen.getByTestId("player-header")).toHaveStyle({ height: layout.controlHeight });
  });

  it("closes when dragged down past the distance", async () => {
    const ctx = await setup();
    await start(ctx);
    const distance = Dimensions.get("window").height * motion.dragToClose.distanceShare + 1;
    await act(() => {
      call("onMoveShouldSetResponderCapture", touch(20, 20, 101));
      call("onResponderGrant", touch(20, 20, 101));
      call("onResponderMove", touch(20, 20 + distance, 5101, 5000));
      call("onResponderRelease", touch(20, 20 + distance, 5101, 5000));
    });
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("does not take the drag while the column is scrolled, and takes it again at its top", async () => {
    const ctx = await setup();
    await start(ctx);
    const content = screen.getByTestId("player-content");
    await fireEvent.scroll(content, { nativeEvent: { contentOffset: { y: 30 } } });
    await act(() => {
      call("onStartShouldSetResponderCapture", touch(0, 0, 10));
    });
    expect(call("onMoveShouldSetResponderCapture", touch(0, 50, 20))).toBe(false);
    await fireEvent.scroll(content, { nativeEvent: { contentOffset: { y: 0 } } });
    await act(() => {
      call("onStartShouldSetResponderCapture", touch(0, 0, 30));
    });
    expect(call("onMoveShouldSetResponderCapture", touch(0, 50, 40))).toBe(true);
  });

  it("shrinks the cover when paused and springs it back when playing", async () => {
    const ctx = await setup();
    await start(ctx);
    await progress(ctx, 10, false);
    expect(ctx.playback.getState().status).toBe("paused");
    expect(spring).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: motion.pausedScale }),
    );
    await progress(ctx, 11, true);
    expect(spring).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: 1 }),
    );
  });

  it("under reduce motion, the cover stays full size and the drag does not move the player", async () => {
    reduce.mockResolvedValue(true);
    const ctx = await setup();
    await act(async () => {
      await Promise.resolve();
    });
    await start(ctx);
    await progress(ctx, 10, false);
    expect(ctx.playback.getState().status).toBe("paused");
    for (const [, config] of spring.mock.calls) {
      expect(config.toValue).not.toBe(motion.pausedScale);
    }
    expect(screen.getByTestId("player-cover-scale")).toHaveStyle({ transform: [{ scale: 1 }] });
    await act(() => {
      call("onMoveShouldSetResponderCapture", touch(20, 20, 101));
      call("onResponderGrant", touch(20, 20, 101));
      call("onResponderMove", touch(20, 120, 5101, 5000));
    });
    expect(screen.getByTestId("player-drag")).toHaveStyle({ transform: [{ translateY: 0 }] });
  });

  it("draws in es", async () => {
    await i18n.changeLanguage("es");
    const ctx = await setup();
    await start(ctx);
    expect(screen.getByText(es.player.playingFrom)).toBeTruthy();
    expect(screen.getByRole("button", { name: es.player.shuffle })).toBeTruthy();
  });
});

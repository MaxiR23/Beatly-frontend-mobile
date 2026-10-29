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
// - the spec's layout: header, full-width cover at high priority, gaps, controls row, the wash from the track's image.color at the color.gradient.detailHero stops on iOS and Android, over the base surface and the player's full height, transparent only at its bottom edge (the neutral base surface without a color, fading in when the next track brings one), the transport icon sizes, the source centered between a leading side and a more button both layout.controlHeight wide on iOS with the native menu, iOS without it and Android
// - the empty state, the resolution failure with retry, loading, close and its fallback, es
// - the platform split of the close button, the drag down closing, the scroll gate of the drag
// - the cover shrinking while paused and springing back, reduce motion keeping the cover and the player still
// - the heart outlined, filled at once on a tap, filled for a liked track, hidden for a track that cannot be liked, the error notice for a rejected like, the more button in the header
//
// Run with: pnpm --filter @beatly/mobile test -- PlayerScreen
//
// SEE: apps/mobile/src/screens/player/PlayerScreen.tsx

import type { PlayableTrack, PlaybackSource } from "@beatly/core";
import { color, icon, layout, motion, radius, spacing } from "@beatly/ui";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen, within } from "@testing-library/react-native";
import { AccessibilityInfo, Animated, Dimensions, Platform, processColor } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { i18n } from "../../../src/adapters/i18n.ts";
import { resources } from "../../../src/i18n/resources.ts";
import { PlayerScreen } from "../../../src/screens/player/PlayerScreen.tsx";
import { makeCore, stateFlag, tiers, Wrapper } from "../../helpers/core.tsx";
import { flatStyle } from "../../helpers/flatStyle.ts";

const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace, canGoBack: () => mockCanGoBack }),
}));

let mockNativeMenu = false;
const mockMenuHost: { props: Record<string, unknown> } = { props: {} };
jest.mock("@beatly/ui/native", () => {
  const actual = jest.requireActual<Record<string, unknown>>("@beatly/ui/native");
  return { ...actual, isNativeMenuAvailable: () => mockNativeMenu };
});
jest.mock("@expo/ui/swift-ui", () => {
  const { View } = jest.requireActual<{ View: React.ComponentType<Record<string, unknown>> }>(
    "react-native",
  );
  const passthrough = ({ children }: { children?: React.ReactNode }) => <View>{children}</View>;
  return {
    Host: (props: Record<string, unknown>) => {
      mockMenuHost.props = props;
      return <View testID="native-menu-host" style={props.style} />;
    },
    Menu: passthrough,
    Image: () => null,
    Button: () => null,
  };
});
jest.mock("@expo/ui/swift-ui/modifiers", () => ({
  accessibilityLabel: (label: string) => ({ accessibilityLabel: label }),
  frame: (params: object) => ({ frame: params }),
  contentShape: (shape: object) => ({ contentShape: shape }),
  shapes: { rectangle: () => ({ type: "rectangle" }) },
}));

const spring = jest.spyOn(Animated, "spring");
const timing = jest.spyOn(Animated, "timing");
const reduce = jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled");

afterEach(async () => {
  Platform.OS = "ios";
  mockNativeMenu = false;
  mockMenuHost.props = {};
  spring.mockClear();
  timing.mockClear();
  reduce.mockClear().mockResolvedValue(false);
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
  artists: [
    { id: "ar1", name: "Ann" },
    { id: "ar2", name: "Bob" },
  ],
  album: "Album",
  albumId: "a1",
  coverUrl,
  image: coverUrl === null ? null : tiers(id),
  durationSeconds: 248,
});
const withColor = (id: string, imageColor: string | null): PlayableTrack => ({
  ...track(id),
  image: tiers(id, imageColor),
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

// The wash's gradient, scoped to the wash node, parsed into offset, alpha and rgb.
function washStops() {
  const [washNode] = nodesWithProp(screen.toJSON(), "testID").filter(
    (node) => node.props.testID === "player-wash",
  );
  const [gradient] = nodesWithProp(washNode?.children, "gradient");
  const flat = gradient?.props.gradient;
  if (!Array.isArray(flat)) throw new Error("gradient is not an array");
  const stops: { offset: number; alpha: number; rgb: number }[] = [];
  for (let i = 0; i < flat.length; i += 2) {
    const packed = Number(flat[i + 1]);
    stops.push({ offset: Number(flat[i]), alpha: (packed >>> 24) & 0xff, rgb: packed & 0xffffff });
  }
  return { gradient, stops };
}

// The header's three parts as drawn: the leading side, the source and the trailing side.
function headerParts() {
  const [header] = nodesWithProp(screen.toJSON(), "testID").filter(
    (node) => node.props.testID === "player-header",
  );
  const parts = Array.isArray(header?.children) ? header.children.filter(isJsonNode) : [];
  if (parts.length !== 3) throw new Error(`header has ${String(parts.length)} parts`);
  const [leading, source, trailing] = parts;
  return { header, leading, source, trailing };
}

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

  it.each([
    ["ios", true],
    ["ios", false],
    ["android", false],
  ] as const)(
    "centers the source between equal sides on %s (native menu: %s)",
    async (os, native) => {
      Platform.OS = os;
      mockNativeMenu = native;
      const ctx = await setup();
      await start(ctx);
      const { header, leading, source, trailing } = headerParts();
      expect(flatStyle(leading?.props.style).width).toBe(layout.controlHeight);
      expect(flatStyle(trailing?.props.style).width).toBe(layout.controlHeight);
      expect(flatStyle(source?.props.style)).toMatchObject({ flex: 1, alignItems: "center" });
      const headerStyle = flatStyle(header?.props.style);
      expect(headerStyle).toMatchObject({ paddingHorizontal: spacing.xl });
      for (const side of ["paddingLeft", "paddingRight", "paddingStart", "paddingEnd"]) {
        expect(headerStyle).not.toHaveProperty(side);
      }
      if (native) {
        expect(trailing?.props.testID).toBe("native-menu-host");
        expect(mockMenuHost.props).not.toHaveProperty("matchContents");
        expect(mockMenuHost.props.alignment).toBe("center");
      }
    },
  );

  it("draws the cover at the large tier", async () => {
    const ctx = await setup();
    await act(async () => {
      await ctx.playback.playList([track("1", "test://img/1")], 0, album);
    });
    expect(screen.getByTestId("cover-single").props.source).toEqual([{ uri: "test://img/1/l" }]);
  });

  it("loads the cover at high priority", async () => {
    const ctx = await setup();
    await act(async () => {
      await ctx.playback.playList([track("1", "test://img/1")], 0, album);
    });
    expect(screen.getByTestId("cover-single").props.priority).toBe("high");
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
    expect(flatStyle(box?.props.style)).toEqual(
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

  it.each(["ios", "android"] as const)(
    "draws the track's color at the detailHero stops on %s",
    async (os) => {
      Platform.OS = os;
      const ctx = await setup();
      await act(async () => {
        await ctx.playback.playList([withColor("1", "#336699")], 0, album);
      });
      const { gradient, stops } = washStops();
      const expected = color.gradient.detailHero.stops;
      expect(stops.map((s) => s.offset)).toEqual(expected.map((s) => s.offset));
      // Within 1: the svg mock packs the alpha with its own rounding of the 0.70 stop.
      stops.forEach((stop, i) => {
        const want = Math.round((expected[i]?.opacity ?? NaN) * 255);
        expect(Math.abs(stop.alpha - want)).toBeLessThanOrEqual(1);
        expect(stop.rgb).toBe(argb("#336699") & 0xffffff);
      });
      expect(gradient?.props).toMatchObject({ x2: "0", y2: "1" });
    },
  );

  it("spans the wash over the player's full height, reaching 0 only at the bottom edge", async () => {
    const ctx = await setup();
    await act(async () => {
      await ctx.playback.playList([withColor("1", "#336699")], 0, album);
    });
    expect(within(screen.getByTestId("player")).getByTestId("player-wash")).toBeTruthy();
    expect(screen.getByTestId("player")).toHaveStyle({
      flex: 1,
      backgroundColor: color.surface.base,
    });
    expect(screen.getByTestId("player-wash")).toHaveStyle({
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    });
    const { stops } = washStops();
    expect(stops[stops.length - 1]).toMatchObject({ offset: 1, alpha: 0 });
    stops.slice(0, -1).forEach((stop) => {
      expect(stop.alpha).toBeGreaterThan(0);
    });
  });

  it("draws no wash when the track's image has no color", async () => {
    const ctx = await setup();
    await act(async () => {
      await ctx.playback.playList([withColor("1", null)], 0, album);
    });
    expect(screen.queryByTestId("player-wash")).toBeNull();
    expect(screen.getByTestId("player")).toHaveStyle({ backgroundColor: color.surface.base });
    await act(async () => {
      await ctx.playback.playList([track("2", "test://cover/2")], 0, album);
    });
    expect(screen.queryByTestId("player-wash")).toBeNull();
    expect(screen.getByTestId("player")).toHaveStyle({ backgroundColor: color.surface.base });
  });

  it("fades the wash in when the next track brings a color", async () => {
    const ctx = await setup();
    await act(async () => {
      await ctx.playback.playList([withColor("1", null), withColor("2", "#336699")], 0, album);
    });
    expect(screen.queryByTestId("player-wash")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: en.player.next }));
    expect(screen.getByTestId("player-wash")).toHaveStyle({ opacity: 0 });
    expect(timing).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        toValue: 1,
        duration: motion.duration.base,
        useNativeDriver: true,
      }),
    );
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

describe("the heart and the more button", () => {
  const withCover = track("1", "test://img/1");
  const heart = (name: string) => screen.queryByRole("button", { name });
  const startWith = (ctx: Ctx, playable: PlayableTrack) =>
    act(async () => {
      await ctx.playback.playList([playable], 0, album);
    });

  it("draws the heart outlined, and filled after a tap without waiting for the network", async () => {
    let release: () => void = () => undefined;
    const ctx = await setup({
      likeOutcome: () =>
        new Promise((resolve) => {
          release = () => {
            resolve({ kind: "confirmed" });
          };
        }),
    });
    await startWith(ctx, withCover);
    expect(heart(en.trackMenu.items.like)).toBeTruthy();
    expect(
      stateFlag(screen.getByRole("button", { name: en.trackMenu.items.like }), "selected"),
    ).toBe(false);
    await fireEvent.press(screen.getByRole("button", { name: en.trackMenu.items.like }));
    expect(ctx.likes.setLiked).toHaveBeenCalledWith(
      expect.objectContaining({ track_id: "1" }),
      true,
    );
    // The service has not answered yet: the mirror alone flipped the heart.
    expect(heart(en.trackMenu.items.unlike)).toBeTruthy();
    expect(heart(en.trackMenu.items.like)).toBeNull();
    await act(() => {
      release();
    });
  });

  it("draws the heart filled for a liked track", async () => {
    const ctx = await setup({ likedIds: ["1"] });
    await startWith(ctx, withCover);
    expect(heart(en.trackMenu.items.unlike)).toBeTruthy();
    expect(
      stateFlag(screen.getByRole("button", { name: en.trackMenu.items.unlike }), "selected"),
    ).toBe(true);
  });

  it("hides the heart for a track without album or cover", async () => {
    const ctx = await setup();
    await startWith(ctx, { ...withCover, album: null, albumId: null, coverUrl: null });
    expect(heart(en.trackMenu.items.like)).toBeNull();
    expect(heart(en.trackMenu.items.unlike)).toBeNull();
  });

  it("shows the error notice when the like is rejected", async () => {
    const ctx = await setup({
      likeOutcome: () => Promise.resolve({ kind: "rejected", reason: "invalid_request" }),
    });
    await startWith(ctx, withCover);
    await fireEvent.press(screen.getByRole("button", { name: en.trackMenu.items.like }));
    expect(await screen.findByText(en.common.error.generic)).toBeTruthy();
  });

  it("draws the more button in the header", async () => {
    const ctx = await setup();
    await startWith(ctx, withCover);
    const header = within(screen.getByTestId("player-header"));
    expect(header.getByRole("button", { name: en.trackMenu.more })).toBeTruthy();
  });
});

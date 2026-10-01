// apps/mobile/test/screens/player/PlayerSheet.test.tsx
//
// Tests for the player's up next, lyrics and related sheet.
//
// Tested:
// - PlayerSheet through PlayerScreen, with UpNextTab, LyricsTab and RelatedTab
//
// What is covered:
// - the handle opening the sheet, the tab routes loading only once opened, the player's drag to close refused while it is open
// - the body drawn while the sheet is dragged up and while it closes, unmounted once the close ends or the spring back of a short handle drag ends, the body drag taking a downward drag again after a reopen or a track change
// - the system back and the accessibility escape closing the sheet first and the player next, no back handler while it is closed
// - the song row closing it, the cache per track across a close and a reopen
// - up next: the rest of the queue then the suggestions without the current track, a press jumping in the queue or playing the suggestions, loading, error with retry, expected empty
// - lyrics: the playing line following the progress and centered, a press seeking, plain lyrics, null lyrics, loading, error with retry
// - related: songs, artists and albums, an empty section hidden, three empty lists, a song playing, an album or artist opening in the current tab, loading, error with retry
// - es
//
// Run with: pnpm --filter @beatly/mobile test -- PlayerSheet
//
// SEE: apps/mobile/src/screens/player/PlayerSheet.tsx

import type { HttpOutcome, PlayableTrack, TrackLyrics, TrackRelated, UpNext } from "@beatly/core";
import { color, motion } from "@beatly/ui";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Animated, BackHandler, Dimensions, FlatList } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { i18n } from "../../../src/adapters/i18n.ts";
import { resources } from "../../../src/i18n/resources.ts";
import { PlayerScreen } from "../../../src/screens/player/PlayerScreen.tsx";
import {
  makeCore,
  memoryStorage,
  relatedFixture,
  upNextFixture,
  Wrapper,
} from "../../helpers/core.tsx";

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({
    back: mockBack,
    replace: mockReplace,
    push: mockPush,
    canGoBack: () => true,
  }),
}));
jest.mock("../../../src/adapters/imageColors.ts", () => ({
  getDominantColor: () => Promise.resolve({ kind: "unavailable" }),
  peekDominantColor: () => undefined,
}));

const spring = jest.spyOn(Animated, "spring");
const scrollToIndex = jest
  .spyOn(FlatList.prototype, "scrollToIndex")
  .mockImplementation(() => undefined);
const height = Dimensions.get("window").height;
const en = resources.en;
const es = resources.es;
const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

afterEach(async () => {
  spring.mockClear();
  scrollToIndex.mockClear();
  mockBack.mockClear();
  mockReplace.mockClear();
  mockPush.mockClear();
  await i18n.changeLanguage("en");
});

const track = (id: string): PlayableTrack => ({
  trackId: id,
  title: `Song ${id}`,
  artists: [
    { id: "ar1", name: "Ann" },
    { id: "ar2", name: "Bob" },
  ],
  album: "Album",
  albumId: "a1",
  coverUrl: null,
  durationSeconds: 248,
});
const album = { kind: "album", id: "a1", name: "Test Album" } as const;

const ok = <T,>(data: T): HttpOutcome<T> => ({ kind: "success", data, maxAgeSeconds: 0 });
const failed = { kind: "transport_failure", cause: "network" } as const;
const pending = () => new Promise<never>(() => undefined);

async function setup(options: Parameters<typeof makeCore>[0] = {}, tracks = ["t1", "t2", "t3"]) {
  const ctx = makeCore({ storage: memoryStorage({ "beatly-sheet-nudges": "3" }), ...options });
  await render(
    <Wrapper core={ctx.core}>
      <SafeAreaProvider initialMetrics={metrics}>
        <PlayerScreen />
      </SafeAreaProvider>
    </Wrapper>,
  );
  await act(async () => {
    await ctx.playback.playList(tracks.map(track), 0, album);
  });
  return ctx;
}

type Ctx = Awaited<ReturnType<typeof setup>>;

const openSheet = () => fireEvent.press(screen.getByRole("button", { name: en.player.sheet.open }));
const selectTab = (name: string) => fireEvent.press(screen.getByRole("tab", { name }));
const progress = (ctx: Ctx, position: number) =>
  act(() => {
    ctx.player.emit({
      type: "progress",
      positionSeconds: position,
      durationSeconds: 248,
      playing: true,
      buffering: false,
    });
  });

const touch = (from: number, to: number, t: number) => ({
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
        startTimeStamp: t - 16,
        currentPageX: 0,
        currentPageY: to,
        currentTimeStamp: t,
        previousPageX: 0,
        previousPageY: from,
        previousTimeStamp: t - 16,
      },
    ],
  },
});

function call(testID: string, name: string): void {
  const handler: unknown = screen.getByTestId(testID).props[name];
  if (typeof handler !== "function") throw new Error(`no ${name}`);
  (handler as () => void)();
}

function captures(testID: string, event: unknown): unknown {
  const handler: unknown = screen.getByTestId(testID).props.onMoveShouldSetResponderCapture;
  if (typeof handler !== "function") throw new Error("no capture");
  return (handler as (event: unknown) => unknown)(event);
}

const panel = () => screen.getByTestId("player-sheet-panel", { includeHiddenElements: true });

describe("the handle and the sheet", () => {
  it("opens the sheet from the handle and loads no tab before it", async () => {
    const ctx = await setup();
    expect(ctx.getUpNext).not.toHaveBeenCalled();
    expect(panel().props.accessibilityElementsHidden).toBe(true);
    await openSheet();
    expect(panel().props.accessibilityElementsHidden).toBe(false);
    expect(screen.getByRole("tab", { name: en.player.sheet.tabs.upNext })).toBeTruthy();
    expect(screen.getByRole("tab", { name: en.player.sheet.tabs.lyrics })).toBeTruthy();
    expect(screen.getByRole("tab", { name: en.player.sheet.tabs.related })).toBeTruthy();
    expect(ctx.getUpNext).toHaveBeenCalledTimes(1);
    expect(ctx.getUpNext).toHaveBeenCalledWith("t1");
    expect(ctx.getLyrics).not.toHaveBeenCalled();
    expect(ctx.getRelated).not.toHaveBeenCalled();
  });

  it("refuses the player's drag to close while the sheet is open", async () => {
    await setup();
    expect(captures("player-drag", touch(0, motion.dragToClose.slop + 1, 20))).toBe(true);
    await openSheet();
    expect(captures("player-drag", touch(0, motion.dragToClose.slop + 1, 40))).toBe(false);
  });

  it("closes only the sheet on the system back, and the player on the next one", async () => {
    const add = jest.spyOn(BackHandler, "addEventListener");
    await setup();
    await openSheet();
    const press = add.mock.calls[0]?.[1];
    if (press === undefined) throw new Error("no back handler");
    let handled = false;
    await act(() => {
      handled = press({ type: "hardwareBackPress", timeStamp: 0 }) === true;
    });
    add.mockRestore();
    expect(handled).toBe(true);
    expect(spring).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: height }),
    );
    expect(panel().props.accessibilityElementsHidden).toBe(true);
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("registers no back handler while the sheet is closed, so back reaches the route", async () => {
    const add = jest.spyOn(BackHandler, "addEventListener");
    await setup();
    expect(add).not.toHaveBeenCalled();
    await openSheet();
    expect(add).toHaveBeenCalledTimes(1);
    add.mockRestore();
  });

  it("closes only the sheet on the accessibility escape, and the player on the next one", async () => {
    await setup();
    await openSheet();
    await act(() => {
      call("player-drag", "onAccessibilityEscape");
    });
    expect(panel().props.accessibilityElementsHidden).toBe(true);
    expect(mockBack).not.toHaveBeenCalled();
    await act(() => {
      call("player-drag", "onAccessibilityEscape");
    });
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("closes from the song row, springing the panel back and hiding it", async () => {
    await setup();
    await openSheet();
    await fireEvent.press(screen.getByRole("button", { name: en.player.sheet.close }));
    expect(spring).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: height }),
    );
    expect(panel().props.accessibilityElementsHidden).toBe(true);
  });

  it("draws the body while the handle is dragged up, before the sheet is open", async () => {
    const ctx = await setup();
    expect(screen.queryByTestId("player-sheet-upnext", { includeHiddenElements: true })).toBeNull();
    await act(() => {
      const event = touch(300, 290, 101);
      const handler: unknown = screen.getByTestId("player-sheet-handle-drag").props
        .onResponderGrant;
      (handler as (event: unknown) => void)(event);
    });
    expect(screen.getByTestId("player-sheet-upnext", { includeHiddenElements: true })).toBeTruthy();
    expect(ctx.getUpNext).toHaveBeenCalledWith("t1");
  });

  it("unmounts the body when the spring back of a short handle drag ends", async () => {
    await setup();
    let done: ((result: { finished: boolean }) => void) | undefined;
    spring.mockImplementationOnce(
      () =>
        ({
          start: (next?: (result: { finished: boolean }) => void) => {
            done = next;
          },
        }) as unknown as Animated.CompositeAnimation,
    );
    const handle = (name: string, event: unknown) =>
      act(() => {
        const handler: unknown = screen.getByTestId("player-sheet-handle-drag").props[name];
        (handler as (event: unknown) => void)(event);
      });
    await handle("onResponderGrant", touch(300, 300, 101));
    await handle("onResponderMove", touch(300, 290, 5101));
    expect(screen.getByTestId("player-sheet-upnext", { includeHiddenElements: true })).toBeTruthy();
    await handle("onResponderRelease", touch(300, 290, 5101));
    expect(screen.getByTestId("player-sheet-upnext", { includeHiddenElements: true })).toBeTruthy();
    await act(() => {
      done?.({ finished: true });
    });
    expect(screen.queryByTestId("player-sheet-upnext", { includeHiddenElements: true })).toBeNull();
  });

  it("keeps the body while the sheet closes and unmounts it when the close ends", async () => {
    await setup();
    await openSheet();
    await screen.findByText("Up u2");
    await fireEvent.press(screen.getByRole("button", { name: en.player.sheet.close }));
    expect(screen.getByTestId("player-sheet-upnext", { includeHiddenElements: true })).toBeTruthy();
    await openSheet();
    spring.mockImplementationOnce(
      () =>
        ({
          start: (done?: (result: { finished: boolean }) => void) => {
            done?.({ finished: true });
          },
        }) as unknown as Animated.CompositeAnimation,
    );
    await fireEvent.press(screen.getByRole("button", { name: en.player.sheet.close }));
    expect(screen.queryByTestId("player-sheet-upnext", { includeHiddenElements: true })).toBeNull();
  });

  it("takes the body drag again after a reopen following a scroll of the list", async () => {
    await setup();
    await openSheet();
    await screen.findByText("Up u2");
    const slop = motion.dragToClose.slop;
    await fireEvent.scroll(screen.getByTestId("player-sheet-upnext"), {
      nativeEvent: { contentOffset: { y: 100 } },
    });
    expect(captures("player-sheet-body-drag", touch(0, slop + 1, 20))).toBe(false);
    spring.mockImplementationOnce(
      () =>
        ({
          start: (done?: (result: { finished: boolean }) => void) => {
            done?.({ finished: true });
          },
        }) as unknown as Animated.CompositeAnimation,
    );
    await fireEvent.press(screen.getByRole("button", { name: en.player.sheet.close }));
    await openSheet();
    await screen.findByText("Up u2");
    expect(captures("player-sheet-body-drag", touch(0, slop + 1, 40))).toBe(true);
  });

  it("takes the body drag again when the lyrics of a new track load after a scroll", async () => {
    const ctx = await setup();
    await openSheet();
    await selectTab(en.player.sheet.tabs.lyrics);
    await screen.findByText("Line one");
    const slop = motion.dragToClose.slop;
    await fireEvent.scroll(screen.getByTestId("player-sheet-lyrics"), {
      nativeEvent: { contentOffset: { y: 100 } },
    });
    expect(captures("player-sheet-body-drag", touch(0, slop + 1, 20))).toBe(false);
    await act(async () => {
      await ctx.playback.skipTo(1);
    });
    await waitFor(() => {
      expect(ctx.getLyrics).toHaveBeenCalledWith("t2");
      expect(captures("player-sheet-body-drag", touch(0, slop + 1, 40))).toBe(true);
    });
  });

  it("pauses from the sheet's own play button", async () => {
    const ctx = await setup();
    await progress(ctx, 1);
    await openSheet();
    await fireEvent.press(screen.getByRole("button", { name: en.player.pause }));
    expect(ctx.playback.getState().status).toBe("paused");
  });

  it("does not ask the API again on a reopen while the outcome is fresh", async () => {
    const ctx = await setup({
      getUpNext: () => Promise.resolve({ kind: "success", data: upNextFixture, maxAgeSeconds: 60 }),
    });
    await openSheet();
    await screen.findByText("Up u2");
    await fireEvent.press(screen.getByRole("button", { name: en.player.sheet.close }));
    await openSheet();
    expect(await screen.findByText("Up u2")).toBeTruthy();
    expect(ctx.getUpNext).toHaveBeenCalledTimes(1);
  });

  it("draws the sheet in Spanish", async () => {
    await i18n.changeLanguage("es");
    await setup({ getRelated: () => Promise.resolve(ok({ songs: [], artists: [], albums: [] })) });
    await fireEvent.press(screen.getByRole("button", { name: es.player.sheet.open }));
    expect(screen.getByRole("tab", { name: es.player.sheet.tabs.upNext })).toBeTruthy();
    await selectTab(es.player.sheet.tabs.related);
    expect(await screen.findByText(es.player.sheet.relatedEmpty)).toBeTruthy();
  });
});

describe("up next", () => {
  it("draws the rest of the queue, then the suggestions without the current track", async () => {
    await setup();
    await openSheet();
    await screen.findByText("Up u2");
    const titles = screen
      .getAllByText(/^(Song t[23]|Up u)/)
      .map((node) => String(node.props.children));
    expect(titles).toEqual(["Song t2", "Song t3", "Up u2", "Up u3"]);
    expect(screen.queryByText("Up t1")).toBeNull();
  });

  it("jumps inside the queue when a row of the rest is pressed", async () => {
    const ctx = await setup();
    await openSheet();
    await screen.findByText("Up u2");
    await fireEvent.press(screen.getByRole("button", { name: "Song t3" }));
    expect(ctx.resolve).toHaveBeenLastCalledWith("t3");
    const state = ctx.playback.getState();
    expect(state.index).toBe(2);
    expect(state.queue.map((t) => t.trackId)).toEqual(["t1", "t2", "t3"]);
    expect(state.source).toEqual(album);
  });

  it("plays the suggestions from the pressed one under a track source", async () => {
    const ctx = await setup();
    await openSheet();
    await screen.findByText("Up u3");
    await fireEvent.press(screen.getByRole("button", { name: "Up u3" }));
    const state = ctx.playback.getState();
    expect(state.queue.map((t) => t.trackId)).toEqual(["u2", "u3"]);
    expect(state.current?.trackId).toBe("u3");
    expect(state.source).toEqual({ kind: "track", id: "t1", name: "Song t1" });
  });

  it("draws the loading state while pending, keeping the rest of the queue", async () => {
    await setup({ getUpNext: pending });
    await openSheet();
    expect(screen.getByLabelText(en.common.loading)).toBeTruthy();
    expect(screen.getByText("Song t2")).toBeTruthy();
  });

  it("draws the error with retry, keeping the rest, and retry asks again", async () => {
    const ctx = await setup({ getUpNext: () => Promise.resolve(failed) });
    await openSheet();
    expect(await screen.findByText(en.common.error.generic)).toBeTruthy();
    expect(screen.getByText("Song t2")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: en.common.retry }));
    expect(ctx.getUpNext).toHaveBeenCalledTimes(2);
  });

  it("draws the expected empty state when nothing is left and nothing is suggested", async () => {
    const only: UpNext = { tracks: upNextFixture.tracks.slice(0, 1) };
    await setup({ getUpNext: () => Promise.resolve(ok(only)) }, ["t1"]);
    await openSheet();
    expect(await screen.findByText(en.player.sheet.upNextEmpty)).toBeTruthy();
  });
});

describe("lyrics", () => {
  it("loads only once the tab is selected", async () => {
    const ctx = await setup();
    await openSheet();
    expect(ctx.getLyrics).not.toHaveBeenCalled();
    await selectTab(en.player.sheet.tabs.lyrics);
    expect(ctx.getLyrics).toHaveBeenCalledWith("t1");
  });

  it("follows the progress with the playing line in the primary tone and centered", async () => {
    const ctx = await setup();
    await openSheet();
    await selectTab(en.player.sheet.tabs.lyrics);
    await screen.findByText("Line one");
    await progress(ctx, 0);
    expect(screen.getByText("Line one")).toHaveStyle({ color: color.text.primary });
    expect(screen.getByText("Line two")).toHaveStyle({ color: color.text.tertiary });
    await progress(ctx, 12);
    expect(screen.getByText("Line one")).toHaveStyle({ color: color.text.tertiary });
    expect(screen.getByText("Line two")).toHaveStyle({ color: color.text.primary });
    expect(scrollToIndex).toHaveBeenLastCalledWith(
      expect.objectContaining({ index: 1, viewPosition: 0.5 }),
    );
  });

  it("seeks to the start of a pressed line", async () => {
    const ctx = await setup();
    await openSheet();
    await selectTab(en.player.sheet.tabs.lyrics);
    await screen.findByText("Line three");
    await progress(ctx, 1);
    await fireEvent.press(screen.getByRole("button", { name: "Line three" }));
    expect(ctx.player.port.seek).toHaveBeenCalledWith(20);
  });

  it("draws plain lyrics as text that cannot be pressed", async () => {
    const plain: TrackLyrics = {
      lyrics: {
        has_timestamps: false,
        source: null,
        lines: [
          { text: "Plain one", start_ms: null, end_ms: null },
          { text: "Plain two", start_ms: null, end_ms: null },
        ],
      },
    };
    await setup({ getLyrics: () => Promise.resolve(ok(plain)) });
    await openSheet();
    await selectTab(en.player.sheet.tabs.lyrics);
    expect(await screen.findByText("Plain one")).toBeTruthy();
    expect(screen.getByText("Plain two")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Plain one" })).toBeNull();
  });

  it("draws the expected empty state for null lyrics", async () => {
    await setup({ getLyrics: () => Promise.resolve(ok({ lyrics: null })) });
    await openSheet();
    await selectTab(en.player.sheet.tabs.lyrics);
    expect(await screen.findByText(en.player.sheet.lyricsEmpty)).toBeTruthy();
  });

  it("draws the loading state", async () => {
    await setup({ getLyrics: pending });
    await openSheet();
    await selectTab(en.player.sheet.tabs.lyrics);
    expect(screen.getByLabelText(en.common.loading)).toBeTruthy();
  });

  it("draws the error with retry and retry asks again", async () => {
    const ctx = await setup({ getLyrics: () => Promise.resolve(failed) });
    await openSheet();
    await selectTab(en.player.sheet.tabs.lyrics);
    expect(await screen.findByText(en.common.error.generic)).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: en.common.retry }));
    expect(ctx.getLyrics).toHaveBeenCalledTimes(2);
  });
});

describe("related", () => {
  it("draws the songs, the artists and the albums", async () => {
    const ctx = await setup();
    await openSheet();
    await selectTab(en.player.sheet.tabs.related);
    expect(await screen.findByText("Up r1")).toBeTruthy();
    expect(ctx.getRelated).toHaveBeenCalledWith("t1");
    expect(screen.getByText(en.player.sheet.songs)).toBeTruthy();
    expect(screen.getByText(en.player.sheet.artists)).toBeTruthy();
    expect(screen.getByText("Similar Artist")).toBeTruthy();
    expect(screen.getByText(en.player.sheet.albums)).toBeTruthy();
    expect(screen.getByText("Related Album")).toBeTruthy();
  });

  it("hides an empty section", async () => {
    const partial: TrackRelated = { ...relatedFixture, songs: [] };
    await setup({ getRelated: () => Promise.resolve(ok(partial)) });
    await openSheet();
    await selectTab(en.player.sheet.tabs.related);
    expect(await screen.findByText("Similar Artist")).toBeTruthy();
    expect(screen.queryByText(en.player.sheet.songs)).toBeNull();
  });

  it("draws the expected empty state for three empty lists", async () => {
    await setup({ getRelated: () => Promise.resolve(ok({ songs: [], artists: [], albums: [] })) });
    await openSheet();
    await selectTab(en.player.sheet.tabs.related);
    expect(await screen.findByText(en.player.sheet.relatedEmpty)).toBeTruthy();
  });

  it("plays the related songs from the pressed one under a track source", async () => {
    const ctx = await setup();
    await openSheet();
    await selectTab(en.player.sheet.tabs.related);
    await screen.findByText("Up r1");
    await fireEvent.press(screen.getByRole("button", { name: "Up r1" }));
    const state = ctx.playback.getState();
    expect(state.current?.trackId).toBe("r1");
    expect(state.source).toEqual({ kind: "track", id: "t1", name: "Song t1" });
  });

  it("closes the player and opens the album in the current tab", async () => {
    await setup();
    await openSheet();
    await selectTab(en.player.sheet.tabs.related);
    await screen.findByText("Related Album");
    await fireEvent.press(screen.getByRole("button", { name: "Related Album" }));
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith({ pathname: "/album/[id]", params: { id: "MPREb_2" } });
  });

  it("closes the player and opens the artist in the current tab", async () => {
    await setup();
    await openSheet();
    await selectTab(en.player.sheet.tabs.related);
    await screen.findByText("Similar Artist");
    await fireEvent.press(screen.getByRole("button", { name: "Similar Artist" }));
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith({ pathname: "/artist/[id]", params: { id: "UCar2" } });
  });

  it("draws the loading state", async () => {
    await setup({ getRelated: pending });
    await openSheet();
    await selectTab(en.player.sheet.tabs.related);
    expect(screen.getByLabelText(en.common.loading)).toBeTruthy();
  });

  it("draws the error with retry and retry asks again", async () => {
    const ctx = await setup({ getRelated: () => Promise.resolve(failed) });
    await openSheet();
    await selectTab(en.player.sheet.tabs.related);
    expect(await screen.findByText(en.common.error.generic)).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: en.common.retry }));
    expect(ctx.getRelated).toHaveBeenCalledTimes(2);
  });
});

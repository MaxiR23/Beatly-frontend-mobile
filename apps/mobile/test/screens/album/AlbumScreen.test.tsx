// apps/mobile/test/screens/album/AlbumScreen.test.tsx
//
// Tests for the album screen.
//
// Tested:
// - AlbumScreen
//
// What is covered:
// - the skeleton, the title, artists and meta line with plural forms, null year and count omitted
// - one spacing token between the title block and the tracks
// - the tracks with an unavailable one disabled, the empty tracks message, hidden empty carousels
// - opening another album from a carousel, opening an artist from the artist names, an artist without an id as plain text, not available for invalid_request without retry
// - starting a list registers the album as a recent and keeps playing when that fails
// - a more button on each playable track and none on an unavailable one
// - an unavailable track (no track id, or is_available false) dimmed, not a button, without menu and announced; next, previous and shuffle never reach it
// - the action row: the play button idle, loading, playing, pausing and resuming, idle while another list plays, the playing track's row marked; play from the first playable track with the whole album, shuffle from a random one, play after shuffle, both registering the recent, disabled with no playable track
// - save: the saved state, saving with its body, removing, rolling back, library_item_not_found, disabled while loading or failing
// - the generic error with retry for upstream_error and a transport failure, back and its fallback, es
//
// Run with: pnpm --filter @beatly/mobile test -- AlbumScreen
//
// SEE: apps/mobile/src/screens/album/AlbumScreen.tsx

import type { Album, HttpOutcome } from "@beatly/core";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react-native";
import { Animated, StyleSheet, type ViewStyle } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { color, motion, spacing } from "@beatly/ui";
import { i18n } from "../../../src/adapters/i18n.ts";
import { resources } from "../../../src/i18n/resources.ts";
import { AlbumScreen } from "../../../src/screens/album/AlbumScreen.tsx";
import { albumFixture, makeCore, stateFlag, Wrapper } from "../../helpers/core.tsx";

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: mockReplace,
    canGoBack: () => mockCanGoBack,
  }),
  useLocalSearchParams: () => ({ id: "MPREb_1" }),
}));
jest.mock("../../../src/adapters/imageColors.ts", () => ({
  getDominantColor: () => Promise.resolve({ kind: "unavailable" }),
  peekDominantColor: () => undefined,
}));

const instant = () =>
  ({
    start: (done?: (result: { finished: boolean }) => void) => {
      done?.({ finished: true });
    },
    stop: () => undefined,
  }) as unknown as Animated.CompositeAnimation;

// Every play button animation of a test that starts a list runs instantly, so no real timer fires outside act.
const realTiming = Animated.timing;
const playButtonDurations: readonly number[] = Object.values(motion.playButton);
beforeEach(() => {
  jest
    .spyOn(Animated, "timing")
    .mockImplementation((value, config) =>
      playButtonDurations.includes(config.duration ?? -1) ? instant() : realTiming(value, config),
    );
});

afterEach(async () => {
  jest.restoreAllMocks();
  mockPush.mockClear();
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

async function setup(options: Parameters<typeof makeCore>[0] = {}) {
  const ctx = makeCore(options);
  await render(
    <Wrapper core={ctx.core}>
      <SafeAreaProvider initialMetrics={metrics}>
        <AlbumScreen />
      </SafeAreaProvider>
    </Wrapper>,
  );
  return ctx;
}

// The top bar draws its own back button first; the floating one is last.
function backButton() {
  const button = screen.getAllByRole("button", { name: en.album.back }).at(-1);
  if (button === undefined) throw new Error("no back button");
  return button;
}

function albumOf(album: Album) {
  return () =>
    Promise.resolve<HttpOutcome<Album>>({ kind: "success", data: album, maxAgeSeconds: 0 });
}

describe("AlbumScreen", () => {
  it("draws the skeleton while the album loads", async () => {
    await setup({ getAlbum: () => new Promise(() => undefined) });
    expect(screen.getByTestId("detail-skeleton")).toBeTruthy();
    expect(screen.getByLabelText(en.common.loading)).toBeTruthy();
  });

  it("asks for the album of the route", async () => {
    const ctx = await setup();
    await screen.findByTestId("album");
    expect(ctx.getAlbum).toHaveBeenCalledWith("MPREb_1");
  });

  it("draws the title, the artists and the meta line with plural forms", async () => {
    await setup();
    expect((await screen.findAllByText("Test Album")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Test Artist").length).toBeGreaterThan(0);
    expect(screen.getByText("Album · 2013 · 13 songs · 1 h 14 min")).toBeTruthy();
  });

  it("leaves exactly one spacing token between the title block and the tracks", async () => {
    await setup();
    const sectionsNode = await screen.findByTestId("album-sections");
    const sections: ViewStyle = StyleSheet.flatten(sectionsNode.props.style as ViewStyle);
    const info: ViewStyle = StyleSheet.flatten(
      screen.getByTestId("album-info").props.style as ViewStyle,
    );
    expect(sections.gap).toBe(spacing.xl);
    // The info block adds no padding or margin below itself: a second one would double the gap.
    expect(info.paddingBottom).toBeUndefined();
    expect(info.marginBottom).toBeUndefined();
    expect(info.paddingVertical).toBeUndefined();
    expect(info.padding).toBeUndefined();
  });

  it("draws a singular song count", async () => {
    await setup({ getAlbum: albumOf({ ...albumFixture, track_count: 1, duration_seconds: 240 }) });
    expect(await screen.findByText("Album · 2013 · 1 song · 4 min")).toBeTruthy();
  });

  it("omits the year and count segments when they are null", async () => {
    await setup({ getAlbum: albumOf({ ...albumFixture, year: null, track_count: null }) });
    expect(await screen.findByText("Album · 1 h 14 min")).toBeTruthy();
  });

  it("draws the tracks and marks an unavailable one as disabled", async () => {
    await setup();
    expect(await screen.findByText("First Song")).toBeTruthy();
    const hidden = screen.getByText("Hidden Song");
    expect(hidden).toBeTruthy();
    expect(stateFlag(hidden.parent?.parent ?? hidden, "disabled")).toBe(true);
    expect(stateFlag(screen.getByText("First Song").parent?.parent ?? hidden, "disabled")).toBe(
      false,
    );
  });

  it("draws the empty tracks message and still the album when it has no tracks", async () => {
    await setup({ getAlbum: albumOf({ ...albumFixture, tracks: [] }) });
    expect(await screen.findByText(en.album.empty)).toBeTruthy();
    expect(screen.getAllByText("Test Album").length).toBeGreaterThan(0);
    expect(screen.queryByText(en.common.retry)).toBeNull();
  });

  it("draws both carousels with data", async () => {
    await setup();
    expect(await screen.findByTestId("album-other-versions")).toBeTruthy();
    expect(screen.getByText(en.album.otherVersions)).toBeTruthy();
    expect(screen.getByTestId("album-recommended")).toBeTruthy();
    expect(screen.getByText(en.album.recommended)).toBeTruthy();
  });

  it("hides other versions and recommended when they are empty", async () => {
    await setup({
      getAlbum: albumOf({ ...albumFixture, other_versions: [], related_recommendations: [] }),
    });
    await screen.findByText("First Song");
    expect(screen.queryByTestId("album-other-versions")).toBeNull();
    expect(screen.queryByTestId("album-recommended")).toBeNull();
  });

  it("opens another album from a carousel card", async () => {
    await setup();
    await fireEvent.press(await screen.findByRole("button", { name: "Other Version" }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: "/album/[id]", params: { id: "MPREb_2" } });
  });

  it("opens an artist from the album's artist names", async () => {
    await setup();
    await fireEvent.press(await screen.findByRole("link", { name: "Test Artist" }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: "/artist/[id]", params: { id: "ar1" } });
  });

  it("draws an artist without an id as plain text", async () => {
    await setup({
      getAlbum: albumOf({ ...albumFixture, artists: [{ id: null, name: "Various" }] }),
    });
    expect((await screen.findAllByText("Various")).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: "Various" })).toBeNull();
  });

  it("draws not available for invalid_request, without retry", async () => {
    await setup({
      getAlbum: () => Promise.resolve({ kind: "api_failure", reason: "invalid_request" }),
    });
    expect(await screen.findByText(en.album.notAvailable)).toBeTruthy();
    expect(screen.queryByText(en.common.retry)).toBeNull();
  });

  it("draws the generic error with retry for upstream_error and refetches", async () => {
    const ctx = await setup({
      getAlbum: () => Promise.resolve({ kind: "api_failure", reason: "upstream_error" }),
    });
    expect(await screen.findByText(en.common.error.generic)).toBeTruthy();
    expect(screen.queryByText(en.album.notAvailable)).toBeNull();
    const before = ctx.getAlbum.mock.calls.length;
    await fireEvent.press(screen.getByRole("button", { name: en.common.retry }));
    await screen.findByText(en.common.error.generic);
    expect(ctx.getAlbum.mock.calls.length).toBeGreaterThan(before);
  });

  it("starts the album from the pressed track without the unavailable one", async () => {
    const third = {
      track_id: "t3",
      title: "Third Song",
      artists: [],
      duration_seconds: 100,
      is_available: true,
      track_number: 3,
    };
    const ctx = await setup({
      getAlbum: albumOf({ ...albumFixture, tracks: [...albumFixture.tracks, third] }),
    });
    await screen.findByText("First Song");
    await fireEvent.press(screen.getByRole("button", { name: "Third Song" }));
    const state = ctx.playback.getState();
    expect(state.queue.map((t) => t.trackId)).toEqual(["t1", "t3"]);
    expect(state.index).toBe(1);
    expect(state.source).toEqual({ kind: "album", id: "MPREb_1", name: "Test Album" });
    expect(state.current?.coverUrl).toBe("test://img/al1");
  });

  it("registers the album as a recent with its artists and cover when a track plays", async () => {
    const ctx = await setup();
    await screen.findByText("First Song");
    await fireEvent.press(screen.getByRole("button", { name: "First Song" }));
    expect(ctx.registerRecent).toHaveBeenCalledWith({
      entity_type: "album",
      entity_id: "MPREb_1",
      metadata: {
        title: "Test Album",
        subtitle: "Test Artist",
        thumbnail_url: "test://img/al1",
      },
    });
    const current = ctx.playback.getState().current;
    expect(current?.album).toBe("Test Album");
    expect(current?.albumId).toBe("MPREb_1");
  });

  it("keeps playing when the recent fails to register", async () => {
    const ctx = await setup({
      registerRecent: () => Promise.resolve({ kind: "api_failure", reason: "upstream_error" }),
    });
    await screen.findByText("First Song");
    await fireEvent.press(screen.getByRole("button", { name: "First Song" }));
    await waitFor(() => {
      expect(ctx.log.warn).toHaveBeenCalledWith("recents.register_failed", {
        entityType: "album",
        detail: "upstream_error",
      });
    });
    expect(ctx.player.port.load).toHaveBeenCalled();
    expect(ctx.playback.getState().current?.trackId).toBe("t1");
    expect(screen.queryByText(en.common.error.generic)).toBeNull();
  });

  it("does not make the unavailable track a button", async () => {
    await setup();
    await screen.findByText("First Song");
    expect(screen.getByRole("button", { name: "First Song" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Hidden Song" })).toBeNull();
  });

  it("dims, disables and announces a track without an id or marked unavailable", async () => {
    const base = { artists: [], duration_seconds: 100 };
    const ctx = await setup({
      getAlbum: albumOf({
        ...albumFixture,
        tracks: [
          ...albumFixture.tracks,
          { ...base, track_id: "t3", title: "Locked Song", is_available: false, track_number: 3 },
          { ...base, track_id: null, title: "Idless Song", is_available: true, track_number: 4 },
        ],
      }),
    });
    await screen.findByText("First Song");
    for (const name of ["Hidden Song", "Locked Song", "Idless Song"]) {
      expect(screen.getByText(name)).toHaveStyle({ color: color.text.disabled });
      expect(screen.queryByRole("button", { name })).toBeNull();
      expect(
        screen.getByLabelText(en.album.trackUnavailable.replace("{{title}}", name)),
      ).toBeTruthy();
    }
    expect(screen.getAllByRole("button", { name: en.trackMenu.more })).toHaveLength(1);
    expect(ctx.playback.getState().queue).toEqual([]);
  });

  it("never reaches an unavailable track with next, previous or shuffle", async () => {
    const base = { artists: [], duration_seconds: 100 };
    const ctx = await setup({
      getAlbum: albumOf({
        ...albumFixture,
        tracks: [
          { ...base, track_id: "t1", title: "First Song", is_available: true, track_number: 1 },
          { ...base, track_id: null, title: "Hidden Song", is_available: false, track_number: 2 },
          { ...base, track_id: "t3", title: "Locked Song", is_available: false, track_number: 3 },
          { ...base, track_id: "t4", title: "Fourth Song", is_available: true, track_number: 4 },
          { ...base, track_id: "t5", title: "Fifth Song", is_available: true, track_number: 5 },
        ],
      }),
    });
    await screen.findByText("First Song");
    await fireEvent.press(screen.getByRole("button", { name: "First Song" }));
    expect(ctx.playback.getState().queue.map((t) => t.trackId)).toEqual(["t1", "t4", "t5"]);
    await act(async () => {
      await ctx.playback.next();
    });
    expect(ctx.playback.getState().current?.trackId).toBe("t4");
    await act(async () => {
      await ctx.playback.next();
    });
    expect(ctx.playback.getState().current?.trackId).toBe("t5");
    await act(async () => {
      await ctx.playback.next();
    });
    expect(ctx.playback.getState().current?.trackId).toBe("t5");
    await act(async () => {
      await ctx.playback.previous();
    });
    expect(ctx.playback.getState().current?.trackId).toBe("t4");
    await act(() => {
      ctx.playback.setShuffle(true);
    });
    expect(new Set(ctx.playback.getState().queue.map((t) => t.trackId))).toEqual(
      new Set(["t1", "t4", "t5"]),
    );
  });

  it("draws the generic error for a transport failure", async () => {
    await setup({
      getAlbum: () => Promise.resolve({ kind: "transport_failure", cause: "network" }),
    });
    expect(await screen.findByText(en.common.error.generic)).toBeTruthy();
    expect(screen.getByRole("button", { name: en.common.retry })).toBeTruthy();
  });

  it("goes back, or replaces with / when there is nothing to go back to", async () => {
    await setup();
    await screen.findByText("First Song");
    await fireEvent.press(backButton());
    expect(mockBack).toHaveBeenCalledTimes(1);
    mockCanGoBack = false;
    await fireEvent.press(backButton());
    expect(mockReplace).toHaveBeenCalledWith("/");
  });

  it("draws in es", async () => {
    await i18n.changeLanguage("es");
    await setup();
    expect(await screen.findByText("Álbum · 2013 · 13 canciones · 1 h 14 min")).toBeTruthy();
    expect(screen.getByText(es.album.otherVersions)).toBeTruthy();
  });
});

describe("AlbumScreen track menu", () => {
  it("draws a more button on each playable row and none on an unavailable one", async () => {
    await setup();
    await screen.findByText("First Song");
    expect(screen.getAllByRole("button", { name: en.trackMenu.more })).toHaveLength(1);
  });
});

const base = { artists: [], duration_seconds: 100 };
const bigAlbum: Album = {
  ...albumFixture,
  tracks: [
    { ...base, track_id: "t1", title: "First Song", is_available: true, track_number: 1 },
    { ...base, track_id: null, title: "Hidden Song", is_available: false, track_number: 2 },
    { ...base, track_id: "t3", title: "Third Song", is_available: true, track_number: 3 },
    { ...base, track_id: "t4", title: "Fourth Song", is_available: true, track_number: 4 },
  ],
};

describe("AlbumScreen action row", () => {
  it("plays the whole album from its first playable track", async () => {
    const ctx = await setup({ getAlbum: albumOf(bigAlbum) });
    await screen.findByText("First Song");
    await fireEvent.press(screen.getByRole("button", { name: en.album.play }));
    const state = ctx.playback.getState();
    expect(state.queue.map((t) => t.trackId)).toEqual(["t1", "t3", "t4"]);
    expect(state.index).toBe(0);
    expect(state.current?.trackId).toBe("t1");
    expect(state.source).toEqual({ kind: "album", id: "MPREb_1", name: "Test Album" });
  });

  it("shuffles the whole album from a random playable track", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0.99);
    const ctx = await setup({ getAlbum: albumOf(bigAlbum) });
    await screen.findByText("First Song");
    await fireEvent.press(screen.getByRole("button", { name: en.album.shuffle }));
    const state = ctx.playback.getState();
    expect(state.shuffle).toBe(true);
    expect(state.current?.trackId).toBe("t4");
    expect(new Set(state.queue.map((t) => t.trackId))).toEqual(new Set(["t1", "t3", "t4"]));
    expect(state.queue.map((t) => t.trackId)).not.toContain(undefined);
  });

  it("plays from the first playable track with shuffle off after another list was shuffled", async () => {
    const ctx = makeCore({ getAlbum: albumOf(bigAlbum) });
    ctx.playback.setShuffle(true);
    await ctx.playback.playList(
      [
        {
          trackId: "x1",
          title: "Other",
          artists: [],
          album: null,
          albumId: null,
          coverUrl: null,
          durationSeconds: 1,
        },
      ],
      0,
      { kind: "album", id: "other", name: "Other" },
    );
    await render(
      <Wrapper core={ctx.core}>
        <SafeAreaProvider initialMetrics={metrics}>
          <AlbumScreen />
        </SafeAreaProvider>
      </Wrapper>,
    );
    await screen.findByText("First Song");
    expect(screen.getByRole("button", { name: en.album.play })).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: en.album.play }));
    const state = ctx.playback.getState();
    expect(state.shuffle).toBe(false);
    expect(state.current?.trackId).toBe("t1");
    expect(state.queue.map((t) => t.trackId)).toEqual(["t1", "t3", "t4"]);
    expect(state.source).toEqual({ kind: "album", id: "MPREb_1", name: "Test Album" });
  });

  it("registers the album as a recent when play or shuffle starts it", async () => {
    const ctx = await setup({ getAlbum: albumOf(bigAlbum) });
    await screen.findByText("First Song");
    const body = {
      entity_type: "album",
      entity_id: "MPREb_1",
      metadata: { title: "Test Album", subtitle: "Test Artist", thumbnail_url: "test://img/al1" },
    };
    await fireEvent.press(screen.getByRole("button", { name: en.album.play }));
    expect(ctx.registerRecent).toHaveBeenLastCalledWith(body);
    await fireEvent.press(screen.getByRole("button", { name: en.album.shuffle }));
    expect(ctx.registerRecent).toHaveBeenCalledTimes(2);
    expect(ctx.registerRecent).toHaveBeenLastCalledWith(body);
  });

  it("leaves the shuffle flag alone on a row tap", async () => {
    const ctx = await setup({ getAlbum: albumOf(bigAlbum) });
    await screen.findByText("First Song");
    await fireEvent.press(screen.getByRole("button", { name: en.album.shuffle }));
    expect(ctx.playback.getState().shuffle).toBe(true);
    await fireEvent.press(screen.getByRole("button", { name: "Fourth Song" }));
    expect(ctx.playback.getState().shuffle).toBe(true);
    await act(() => {
      ctx.playback.setShuffle(false);
    });
    await fireEvent.press(screen.getByRole("button", { name: "Fourth Song" }));
    expect(ctx.playback.getState().shuffle).toBe(false);
  });

  it.each([
    ["every track unavailable", { ...bigAlbum, tracks: bigAlbum.tracks.slice(1, 2) }],
    ["no tracks", { ...bigAlbum, tracks: [] }],
  ])("disables play and shuffle when no track is playable: %s", async (_name, album) => {
    const ctx = await setup({ getAlbum: albumOf(album) });
    await screen.findByTestId("album-actions");
    for (const name of [en.album.play, en.album.shuffle]) {
      const button = screen.getByRole("button", { name });
      expect(stateFlag(button, "disabled")).toBe(true);
      await fireEvent.press(button);
    }
    expect(ctx.playback.getState().queue).toEqual([]);
  });

  const playingEvent = (ctx: Awaited<ReturnType<typeof setup>>) =>
    act(() => {
      ctx.player.emit({
        type: "progress",
        playing: true,
        buffering: false,
        positionSeconds: 1,
        durationSeconds: 100,
      });
    });

  it("goes idle, loading, playing, then pauses and resumes", async () => {
    const ctx = await setup({ getAlbum: albumOf(bigAlbum) });
    await screen.findByText("First Song");
    const idle = screen.getByRole("button", { name: en.album.play });
    expect(within(idle).getByText(en.album.play)).toBeTruthy();
    // The label fade and the shrink finish at once; the spinner comes after them.
    jest.spyOn(Animated, "timing").mockImplementationOnce(instant).mockImplementationOnce(instant);
    await fireEvent.press(idle);
    const loading = screen.getByRole("button", { name: en.album.play });
    expect(stateFlag(loading, "busy")).toBe(true);
    expect(within(loading).getByTestId("play-button-busy")).toBeTruthy();
    await playingEvent(ctx);
    const pause = screen.getByRole("button", { name: en.album.pause });
    expect(within(pause).getByTestId("play-button-pause")).toBeTruthy();
    await fireEvent.press(pause);
    await waitFor(() => {
      expect(ctx.playback.getState().status).toBe("paused");
    });
    expect(ctx.player.port.pause).toHaveBeenCalled();
    const paused = screen.getByRole("button", { name: en.album.play });
    expect(within(paused).getByTestId("play-button-play")).toBeTruthy();
    ctx.player.port.play.mockClear();
    await fireEvent.press(paused);
    await waitFor(() => {
      expect(ctx.playback.getState().status).toBe("playing");
    });
    expect(ctx.player.port.play).toHaveBeenCalled();
  });

  it("shows play idle while another list plays", async () => {
    const ctx = makeCore({ getAlbum: albumOf(bigAlbum) });
    await ctx.playback.playList(
      [
        {
          trackId: "x1",
          title: "Other",
          artists: [],
          album: null,
          albumId: null,
          coverUrl: null,
          durationSeconds: 1,
        },
      ],
      0,
      { kind: "album", id: "other", name: "Other" },
    );
    await render(
      <Wrapper core={ctx.core}>
        <SafeAreaProvider initialMetrics={metrics}>
          <AlbumScreen />
        </SafeAreaProvider>
      </Wrapper>,
    );
    await screen.findByText("First Song");
    await playingEvent(ctx);
    const button = screen.getByRole("button", { name: en.album.play });
    expect(within(button).getByText(en.album.play)).toBeTruthy();
    await fireEvent.press(button);
    expect(ctx.playback.getState().source).toEqual({
      kind: "album",
      id: "MPREb_1",
      name: "Test Album",
    });
  });

  it("marks the playing track's row and freezes it on pause", async () => {
    const ctx = await setup({ getAlbum: albumOf(bigAlbum) });
    await screen.findByText("First Song");
    await fireEvent.press(screen.getByRole("button", { name: "Third Song" }));
    await playingEvent(ctx);
    expect(
      within(screen.getByRole("button", { name: "Third Song" })).getByTestId("now-playing-bars"),
    ).toBeTruthy();
    expect(
      within(screen.getByRole("button", { name: "First Song" })).queryByTestId("now-playing-bars"),
    ).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: en.album.pause }));
    await waitFor(() => {
      expect(ctx.playback.getState().status).toBe("paused");
    });
    expect(
      within(screen.getByRole("button", { name: "Third Song" })).getByTestId("now-playing-bars"),
    ).toBeTruthy();
  });
});

describe("AlbumScreen save", () => {
  const savedState = (saved: boolean) => () =>
    Promise.resolve<HttpOutcome<{ saved: boolean }>>({
      kind: "success",
      data: { saved },
      maxAgeSeconds: 0,
    });

  it("asks for the saved state of the route's album", async () => {
    const ctx = await setup();
    await screen.findByText("First Song");
    expect(ctx.getSavedState).toHaveBeenCalledWith("album", "MPREb_1");
  });

  it("draws save as saved when the album is saved", async () => {
    await setup({ getSavedState: savedState(true) });
    const button = await screen.findByRole("button", { name: en.album.unsave });
    expect(stateFlag(button, "selected")).toBe(true);
  });

  it("saves the album with its body and flips the label at once, then rereads the state", async () => {
    // The server answers not saved first and saved once the save went through.
    const ctx = await setup({
      getSavedState: jest
        .fn<() => ReturnType<ReturnType<typeof savedState>>>()
        .mockImplementationOnce(savedState(false))
        .mockImplementation(savedState(true)),
    });
    await fireEvent.press(await screen.findByRole("button", { name: en.album.save }));
    expect(ctx.saveItem).toHaveBeenCalledWith({
      kind: "album",
      source: "external",
      external_id: "MPREb_1",
      title: "Test Album",
      album_id: "MPREb_1",
      album_name: "Test Album",
      thumbnail_url: "test://img/al1",
      artist: "Test Artist",
      artist_id: "ar1",
    });
    expect(await screen.findByRole("button", { name: en.album.unsave })).toBeTruthy();
    await waitFor(() => {
      expect(ctx.getSavedState).toHaveBeenCalledTimes(2);
    });
  });

  it("removes a saved album", async () => {
    // The server answers saved first and not saved once the remove went through.
    const ctx = await setup({
      getSavedState: jest
        .fn<() => ReturnType<ReturnType<typeof savedState>>>()
        .mockImplementationOnce(savedState(true))
        .mockImplementation(savedState(false)),
    });
    await fireEvent.press(await screen.findByRole("button", { name: en.album.unsave }));
    expect(ctx.removeItem).toHaveBeenCalledWith("album", "MPREb_1");
    expect(await screen.findByRole("button", { name: en.album.save })).toBeTruthy();
  });

  it("rolls the save button back when the save fails", async () => {
    // The refetch after the failure never answers, so the label returns by the rollback alone.
    const ctx = await setup({
      getSavedState: jest
        .fn<() => ReturnType<ReturnType<typeof savedState>>>()
        .mockImplementationOnce(savedState(false))
        .mockImplementation(() => new Promise(() => undefined)),
      saveItem: () => Promise.resolve({ kind: "api_failure", reason: "upstream_error" }),
    });
    await fireEvent.press(await screen.findByRole("button", { name: en.album.save }));
    await waitFor(() => {
      expect(ctx.log.warn).toHaveBeenCalledWith("library.save_failed", {
        kind: "album",
        detail: "upstream_error",
      });
    });
    expect(await screen.findByRole("button", { name: en.album.save })).toBeTruthy();
    expect(screen.queryByText(en.common.error.generic)).toBeNull();
  });

  it("keeps not saved when the remove answers library_item_not_found", async () => {
    const getSavedState = jest
      .fn<() => ReturnType<ReturnType<typeof savedState>>>()
      .mockImplementationOnce(savedState(true))
      .mockImplementation(savedState(false));
    await setup({
      getSavedState,
      removeItem: () => Promise.resolve({ kind: "api_failure", reason: "library_item_not_found" }),
    });
    await fireEvent.press(await screen.findByRole("button", { name: en.album.unsave }));
    expect(await screen.findByRole("button", { name: en.album.save })).toBeTruthy();
  });

  it("disables save while its state loads", async () => {
    await setup({ getSavedState: () => new Promise(() => undefined) });
    await screen.findByText("First Song");
    expect(stateFlag(screen.getByRole("button", { name: en.album.save }), "disabled")).toBe(true);
  });

  it("disables save and draws the rest when its state fails", async () => {
    await setup({
      getSavedState: () => Promise.resolve({ kind: "api_failure", reason: "upstream_error" }),
    });
    await screen.findByText("First Song");
    await waitFor(() => {
      expect(stateFlag(screen.getByRole("button", { name: en.album.save }), "disabled")).toBe(true);
    });
    expect(screen.queryByText(en.common.error.generic)).toBeNull();
  });

  it("draws the row labels in es", async () => {
    await i18n.changeLanguage("es");
    await setup();
    const play = await screen.findByRole("button", { name: es.album.play });
    expect(within(play).getByText(es.album.play)).toBeTruthy();
    expect(screen.getByRole("button", { name: es.album.shuffle })).toBeTruthy();
    expect(screen.getByRole("button", { name: es.album.save })).toBeTruthy();
  });
});

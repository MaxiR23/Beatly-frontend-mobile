// apps/mobile/test/screens/playlist/PlaylistScreen.test.tsx
//
// Tests for the playlist screen.
//
// Tested:
// - PlaylistScreen
//
// What is covered:
// - the header of an own (its mosaic), a liked and a genre playlist: cover, title, creator, description, meta line
// - the tracks, each with a more button, infinite scroll for own and liked, a genre playlist's tracks from its header
// - the empty message under the header, not found from the header or the tracks, the generic error with retry
// - starting a list registers an own, a liked and a genre playlist as a recent with its kind
// - the track menu: remove from an own playlist calls the service and refetches the tracks, none for the liked and genre playlists
// - the liked playlist's play and shuffle pills
// - the action row: play and shuffle of the whole list (after loading every page for own and liked), busy until the pages load, a failed page drawing the error, leaving the screen cancelling the start, disabled when empty, registering the recent, turning shuffle off on play after another list was shuffled, the play button idle, loading, playing, pausing and resuming, every row of the playing track marked
// - save only on a genre playlist: its state, its body, rolling back, disabled while loading or failing, none on own and liked
// - the options button only on an own playlist, after play, opening the sheet with edit, edit tracks and delete in that order, edit tracks opening the edit mode without asking; a saved rename shown as the player's source with the queue kept; the edit sheet prefilled, Save disabled unchanged or invalid, only changed fields, empty description as null, a failed save keeping the sheet and input, a saved edit closing it and redrawing the header; delete asking first, cancel doing nothing, confirm going back, a failed delete showing the notice and staying, playback untouched; no recent registered by an edit or a delete
// - the skeleton, back and its fallback, es
//
// Run with: pnpm --filter @beatly/mobile test -- PlaylistScreen
//
// SEE: apps/mobile/src/screens/playlist/PlaylistScreen.tsx

import type { HttpOutcome, PageResult, PlaylistTrack } from "@beatly/core";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react-native";
import { Alert, Animated } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { motion } from "@beatly/ui";

import { i18n } from "../../../src/adapters/i18n.ts";
import { resources } from "../../../src/i18n/resources.ts";
import { PlaylistScreen } from "../../../src/screens/playlist/PlaylistScreen.tsx";
import {
  createdPlaylistFixture,
  likedDetailFixture,
  makeCore,
  pageOf,
  playlistDetailFixture,
  playlistTrackFixture,
  profileFixture,
  publicGenrePlaylistFixture,
  stateFlag,
  successOf,
  Wrapper,
} from "../../helpers/core.tsx";

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();
let mockCanGoBack = true;
let mockParams: Record<string, string | undefined> = { id: "p1", source: "user" };
jest.mock("expo-router", () => ({
  useRouter: () => ({
    back: mockBack,
    replace: mockReplace,
    push: mockPush,
    canGoBack: () => mockCanGoBack,
  }),
  useLocalSearchParams: () => mockParams,
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
  mockBack.mockClear();
  mockReplace.mockClear();
  mockPush.mockClear();
  mockCanGoBack = true;
  mockParams = { id: "p1", source: "user" };
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
        <PlaylistScreen />
      </SafeAreaProvider>
    </Wrapper>,
  );
  return ctx;
}

function detail<T>(data: T) {
  return () => Promise.resolve<HttpOutcome<T>>({ kind: "success", data, maxAgeSeconds: 0 });
}

const first = playlistTrackFixture;
const second: PlaylistTrack = {
  ...playlistTrackFixture,
  track_id: "t2",
  title: "Second Song",
  artists: [
    { id: "ar1", name: "Test Artist" },
    { id: null, name: "Guest" },
  ],
  position: 2,
};
const two: PlaylistTrack[] = [first, second];

function tracksOf(items: PlaylistTrack[]) {
  return () => Promise.resolve(pageOf(items));
}

const notFound: HttpOutcome<never> = { kind: "api_failure", reason: "playlist_not_found" };
const upstream: HttpOutcome<never> = { kind: "api_failure", reason: "upstream_error" };

describe("PlaylistScreen", () => {
  it("draws the skeleton while the header or the tracks load", async () => {
    await setup({ getPlaylist: () => new Promise(() => undefined) });
    expect(screen.getByTestId("detail-skeleton")).toBeTruthy();
    expect(screen.getByLabelText(en.common.loading)).toBeTruthy();
  });

  it("draws the skeleton while the tracks load", async () => {
    await setup({ listPlaylistTracks: () => new Promise(() => undefined) });
    expect(screen.getByTestId("detail-skeleton")).toBeTruthy();
  });

  it("draws an own playlist's title, avatar and username, description and meta", async () => {
    const ctx = await setup({ listPlaylistTracks: tracksOf(two) });
    expect((await screen.findAllByText("Road trip")).length).toBeGreaterThan(0);
    expect(ctx.getPlaylist).toHaveBeenCalledWith("p1");
    expect(await screen.findByText("maxi_23")).toBeTruthy();
    expect(screen.getByTestId("playlist-creator")).toBeTruthy();
    expect(screen.getByText("Windows down")).toBeTruthy();
    expect(screen.getByText("Private · 2 songs · 1 h 14 min")).toBeTruthy();
    expect(screen.getByTestId("cover-mosaic")).toBeTruthy();
  });

  it("draws the placeholder for an own playlist with no thumbnails", async () => {
    await setup({ getPlaylist: detail({ ...playlistDetailFixture, thumbnail_urls: [] }) });
    await screen.findByTestId("playlist-info");
    expect(screen.getByTestId("cover-placeholder")).toBeTruthy();
  });

  it("draws Public for a public own playlist", async () => {
    await setup({
      getPlaylist: detail({ ...playlistDetailFixture, is_public: true }),
    });
    expect(await screen.findByText("Public · 2 songs · 1 h 14 min")).toBeTruthy();
  });

  it("draws the display name when there is no username", async () => {
    await setup({
      getMyProfile: () =>
        Promise.resolve(successOf({ ...profileFixture, username: null, display_name: "Maxi" })),
    });
    expect(await screen.findByText("Maxi")).toBeTruthy();
  });

  it("draws no creator line when the profile fails", async () => {
    await setup({ getMyProfile: () => Promise.resolve(upstream) });
    await screen.findByTestId("playlist-info");
    expect(screen.queryByTestId("playlist-creator")).toBeNull();
    expect(screen.queryByText(en.common.error.generic)).toBeNull();
  });

  it("draws liked with the heart tile, Liked songs, no creator and no description", async () => {
    mockParams = { id: "liked", source: "liked" };
    const ctx = await setup({
      getLikedPlaylist: detail({
        ...likedDetailFixture,
        total_count: 3,
        total_duration_seconds: 600,
      }),
    });
    expect((await screen.findAllByText(en.playlist.liked)).length).toBeGreaterThan(0);
    expect(ctx.getLikedPlaylist).toHaveBeenCalled();
    expect(screen.getByTestId("cover-tile")).toBeTruthy();
    expect(screen.queryByTestId("playlist-creator")).toBeNull();
    expect(screen.queryByText("liked")).toBeNull();
    expect(screen.getByText("3 songs · 10 min")).toBeTruthy();
  });

  it("draws a genre playlist with its cover, Beatly and its meta", async () => {
    mockParams = { id: "gp1", source: "genre" };
    const ctx = await setup();
    expect((await screen.findAllByText("Pop hits")).length).toBeGreaterThan(0);
    expect(ctx.getGenrePlaylist).toHaveBeenCalledWith("gp1");
    expect(screen.getByTestId("cover-mosaic")).toBeTruthy();
    expect(screen.getByText(en.common.brand)).toBeTruthy();
    expect(screen.getByText("12 songs · 40 min")).toBeTruthy();
  });

  it("draws the genre thumbnail alone when there is no mosaic", async () => {
    mockParams = { id: "gp1", source: "genre" };
    await setup({
      getGenrePlaylist: detail({ ...publicGenrePlaylistFixture, thumbnails: [] }),
    });
    await screen.findByTestId("playlist-info");
    expect(screen.getByTestId("cover-single")).toBeTruthy();
  });

  it("draws the description only when there is one", async () => {
    await setup({ getPlaylist: detail({ ...playlistDetailFixture, description: null }) });
    await screen.findByTestId("playlist-info");
    expect(screen.queryByText("Windows down")).toBeNull();
  });

  it("draws the singular song", async () => {
    await setup({
      getPlaylist: detail({
        ...playlistDetailFixture,
        total_count: 1,
        total_duration_seconds: 240,
      }),
    });
    expect(await screen.findByText("Private · 1 song · 4 min")).toBeTruthy();
  });

  it("draws each track with its title and artists as a pressable row", async () => {
    await setup({ listPlaylistTracks: tracksOf(two) });
    expect(await screen.findByText("First Song")).toBeTruthy();
    expect(screen.getByText("Second Song")).toBeTruthy();
    expect(screen.getByText("Test Artist, Guest")).toBeTruthy();
    expect(screen.getByRole("button", { name: "First Song" })).toBeTruthy();
  });

  it("starts the loaded list from the pressed row with the playlist source", async () => {
    const ctx = await setup({ listPlaylistTracks: tracksOf(two) });
    await screen.findByText("First Song");
    await fireEvent.press(screen.getByRole("button", { name: "Second Song" }));
    const state = ctx.playback.getState();
    expect(state.current?.trackId).toBe("t2");
    expect(state.queue.map((t) => t.trackId)).toEqual(["t1", "t2"]);
    expect(state.index).toBe(1);
    expect(state.source).toEqual({ kind: "playlist", id: "p1", name: "Road trip" });
    expect(state.current?.artists).toEqual([
      { id: "ar1", name: "Test Artist" },
      { id: null, name: "Guest" },
    ]);
  });

  it("registers an own playlist as a recent with its username and first thumbnail", async () => {
    const ctx = await setup({ listPlaylistTracks: tracksOf(two) });
    await screen.findByText("maxi_23");
    await fireEvent.press(screen.getByRole("button", { name: "First Song" }));
    expect(ctx.registerRecent).toHaveBeenCalledWith({
      entity_type: "playlist",
      entity_id: "p1",
      metadata: {
        title: "Road trip",
        subtitle: "maxi_23",
        thumbnail_url: "test://img/1",
        kind: "user",
      },
    });
  });

  it("registers a genre playlist as a recent with Beatly as its subtitle", async () => {
    mockParams = { id: "gp1", source: "genre" };
    const ctx = await setup({
      getGenrePlaylist: detail({ ...publicGenrePlaylistFixture, tracks: two }),
    });
    await fireEvent.press(await screen.findByRole("button", { name: "First Song" }));
    expect(ctx.registerRecent).toHaveBeenCalledWith({
      entity_type: "playlist",
      entity_id: "gp1",
      metadata: {
        title: "Pop hits",
        subtitle: "Beatly",
        thumbnail_url: "test://img/1",
        kind: "genre",
      },
    });
  });

  it("registers liked as a recent with its translated title and no subtitle or cover", async () => {
    mockParams = { id: "liked", source: "liked" };
    const ctx = await setup({ listLikedTracks: tracksOf(two) });
    await fireEvent.press(await screen.findByRole("button", { name: "First Song" }));
    expect(ctx.registerRecent).toHaveBeenCalledWith({
      entity_type: "playlist",
      entity_id: "liked",
      metadata: { title: en.playlist.liked, subtitle: null, thumbnail_url: null, kind: "liked" },
    });
  });

  it("draws back, the rows, the options button and one more button per row", async () => {
    await setup({ listPlaylistTracks: tracksOf(two) });
    await screen.findByText("First Song");
    const names = screen.getAllByRole("button").map((b) => b.props.accessibilityLabel as unknown);
    expect(new Set(names)).toEqual(
      new Set([
        en.playlist.back,
        en.playlist.play,
        en.playlist.shuffle,
        "First Song",
        "Second Song",
        en.trackMenu.more,
        en.playlist.options.more,
      ]),
    );
    expect(names.filter((name) => name === en.trackMenu.more)).toHaveLength(2);
  });

  it("loads the next page of an own playlist at the end of the list", async () => {
    const ctx = await setup({
      listPlaylistTracks: (_id, cursor) =>
        Promise.resolve(
          cursor === null
            ? pageOf([first], { has_more: true, next_cursor: "c1" })
            : pageOf([second]),
        ),
    });
    await screen.findByText("First Song");
    await fireEvent(screen.getByTestId("playlist-list"), "onEndReached");
    expect(await screen.findByText("Second Song")).toBeTruthy();
    expect(ctx.listPlaylistTracks).toHaveBeenLastCalledWith("p1", "c1");
  });

  it("loads the next page of liked at the end of the list", async () => {
    mockParams = { id: "liked", source: "liked" };
    const ctx = await setup({
      listLikedTracks: (cursor) =>
        Promise.resolve(
          cursor === null
            ? pageOf([first], { has_more: true, next_cursor: "c1" })
            : pageOf([second]),
        ),
    });
    await screen.findByText("First Song");
    await fireEvent(screen.getByTestId("playlist-list"), "onEndReached");
    expect(await screen.findByText("Second Song")).toBeTruthy();
    expect(ctx.listLikedTracks).toHaveBeenLastCalledWith("c1");
  });

  it("draws the genre playlist's tracks", async () => {
    mockParams = { id: "gp1", source: "genre" };
    const ctx = await setup({
      getGenrePlaylist: detail({ ...publicGenrePlaylistFixture, tracks: two }),
    });
    expect(await screen.findByText("Second Song")).toBeTruthy();
    expect(ctx.getGenrePlaylist).toHaveBeenCalledTimes(1);
    expect(ctx.getGenrePlaylist).toHaveBeenCalledWith("gp1");
    expect(ctx.listPlaylistTracks).not.toHaveBeenCalled();
    expect(ctx.listLikedTracks).not.toHaveBeenCalled();
  });

  it("draws the empty message for a genre playlist with no tracks", async () => {
    mockParams = { id: "gp1", source: "genre" };
    await setup();
    expect(await screen.findByText(en.playlist.empty)).toBeTruthy();
    expect(screen.queryByText(en.common.retry)).toBeNull();
  });

  it("draws the empty message under the header when there are no tracks", async () => {
    await setup();
    expect(await screen.findByText(en.playlist.empty)).toBeTruthy();
    expect(screen.getAllByText("Road trip").length).toBeGreaterThan(0);
    expect(screen.queryByText(en.common.retry)).toBeNull();
  });

  it("draws Playlist not found for playlist_not_found on the header", async () => {
    await setup({ getPlaylist: () => Promise.resolve(notFound) });
    expect(await screen.findByText(en.playlist.notFound)).toBeTruthy();
    expect(screen.queryByText(en.common.retry)).toBeNull();
  });

  it("draws Playlist not found for playlist_not_found on the tracks", async () => {
    await setup({
      listPlaylistTracks: () => Promise.resolve<HttpOutcome<PageResult<PlaylistTrack>>>(notFound),
    });
    expect(await screen.findByText(en.playlist.notFound)).toBeTruthy();
    expect(screen.queryByText(en.common.retry)).toBeNull();
  });

  it("draws the generic error with retry for upstream_error and retry refetches only the failed query", async () => {
    const ctx = await setup({ getPlaylist: () => Promise.resolve(upstream) });
    expect(await screen.findByText(en.common.error.generic)).toBeTruthy();
    expect(screen.queryByText(en.playlist.notFound)).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: en.common.retry }));
    expect(ctx.getPlaylist).toHaveBeenCalledTimes(2);
    expect(ctx.listPlaylistTracks).toHaveBeenCalledTimes(1);
  });

  it("draws the generic error for a transport failure", async () => {
    await setup({
      listPlaylistTracks: () =>
        Promise.resolve<HttpOutcome<PageResult<PlaylistTrack>>>({
          kind: "transport_failure",
          cause: "network",
        }),
    });
    expect(await screen.findByText(en.common.error.generic)).toBeTruthy();
    expect(screen.getByRole("button", { name: en.common.retry })).toBeTruthy();
  });

  it("goes back, or replaces with / when there is nothing to go back to", async () => {
    await setup();
    await screen.findByTestId("playlist-info");
    await fireEvent.press(screen.getByRole("button", { name: en.playlist.back }));
    expect(mockBack).toHaveBeenCalledTimes(1);
    mockCanGoBack = false;
    await fireEvent.press(screen.getByRole("button", { name: en.playlist.back }));
    expect(mockReplace).toHaveBeenCalledWith("/");
  });

  it("draws in es", async () => {
    await i18n.changeLanguage("es");
    mockParams = { id: "liked", source: "liked" };
    await setup({
      getLikedPlaylist: detail({
        ...likedDetailFixture,
        total_count: 3,
        total_duration_seconds: 600,
      }),
    });
    expect((await screen.findAllByText(es.playlist.liked)).length).toBeGreaterThan(0);
    expect(screen.getByText("3 canciones · 10 min")).toBeTruthy();
    expect(screen.getByText(es.playlist.empty)).toBeTruthy();
    expect(screen.getByRole("button", { name: es.playlist.play })).toBeTruthy();
    expect(screen.getByRole("button", { name: es.playlist.shuffle })).toBeTruthy();
  });
});

describe("PlaylistScreen track menu", () => {
  const more = () => {
    const [first] = screen.getAllByRole("button", { name: en.trackMenu.more });
    if (first === undefined) throw new Error("no more button");
    return first;
  };

  it("an own playlist's menu offers remove, which calls removeTrackFromPlaylist and refetches the tracks", async () => {
    const ctx = await setup({ listPlaylistTracks: tracksOf(two) });
    await screen.findByText("First Song");
    const before = ctx.listPlaylistTracks.mock.calls.length;
    await fireEvent.press(more());
    await fireEvent.press(
      screen.getByRole("button", { name: en.trackMenu.items.removeFromPlaylist }),
    );
    expect(ctx.removeTrackFromPlaylist).toHaveBeenCalledWith("p1", "t1");
    await waitFor(() => {
      expect(ctx.listPlaylistTracks.mock.calls.length).toBeGreaterThan(before);
    });
  });

  it("the liked and genre menus do not offer remove", async () => {
    mockParams = { id: "liked", source: "liked" };
    await setup({ listLikedTracks: tracksOf(two) });
    await screen.findByText("First Song");
    await fireEvent.press(more());
    expect(screen.getByRole("button", { name: en.trackMenu.items.credits })).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: en.trackMenu.items.removeFromPlaylist }),
    ).toBeNull();
  });

  it("a genre playlist's menu does not offer remove", async () => {
    mockParams = { id: "gp1", source: "genre" };
    await setup({ getGenrePlaylist: detail({ ...publicGenrePlaylistFixture, tracks: two }) });
    await screen.findByText("First Song");
    await fireEvent.press(more());
    expect(screen.getByRole("button", { name: en.trackMenu.items.credits })).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: en.trackMenu.items.removeFromPlaylist }),
    ).toBeNull();
  });
});

const third: PlaylistTrack = { ...first, track_id: "t3", title: "Third Song", position: 3 };
const fourth: PlaylistTrack = { ...first, track_id: "t4", title: "Fourth Song", position: 4 };

// The first page holds t1 and t2, the second t3 and t4.
function twoPages(secondPage: () => Promise<HttpOutcome<PageResult<PlaylistTrack>>>) {
  return (cursor: string | null) =>
    cursor === null
      ? Promise.resolve(pageOf(two, { has_more: true, next_cursor: "c1" }))
      : secondPage();
}
const secondPageOk = () => Promise.resolve(pageOf([third, fourth]));
const otherTrack = {
  trackId: "x1",
  title: "Other",
  artists: [],
  album: null,
  albumId: null,
  coverUrl: null,
  durationSeconds: 1,
};
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
const ids = (ctx: Awaited<ReturnType<typeof setup>>) =>
  ctx.playback.getState().queue.map((t) => t.trackId);

describe("PlaylistScreen action row", () => {
  it("plays an own playlist whole after loading its remaining pages", async () => {
    const ctx = await setup({
      listPlaylistTracks: (_id, cursor) => twoPages(secondPageOk)(cursor),
    });
    await screen.findByText("First Song");
    await fireEvent.press(screen.getByRole("button", { name: en.playlist.play }));
    await waitFor(() => {
      expect(ids(ctx)).toEqual(["t1", "t2", "t3", "t4"]);
    });
    expect(ctx.listPlaylistTracks).toHaveBeenCalledWith("p1", "c1");
    const state = ctx.playback.getState();
    expect(state.current?.trackId).toBe("t1");
    expect(state.source).toEqual({ kind: "playlist", id: "p1", name: "Road trip" });
  });

  it("plays the liked playlist whole after loading its remaining pages", async () => {
    mockParams = { id: "liked", source: "liked" };
    const ctx = await setup({
      listLikedTracks: (cursor) => twoPages(secondPageOk)(cursor),
    });
    await screen.findByText("First Song");
    await fireEvent.press(screen.getByRole("button", { name: en.playlist.play }));
    await waitFor(() => {
      expect(ids(ctx)).toEqual(["t1", "t2", "t3", "t4"]);
    });
    expect(ctx.listLikedTracks).toHaveBeenCalledWith("c1");
  });

  it("draws play then shuffle pills on the liked playlist", async () => {
    mockParams = { id: "liked", source: "liked" };
    await setup({ listLikedTracks: tracksOf(two) });
    await screen.findByText("First Song");
    const actions = within(screen.getByTestId("playlist-actions"));
    expect(
      actions.getAllByRole("button").map((b) => b.props.accessibilityLabel as unknown),
    ).toEqual([en.playlist.play, en.playlist.shuffle]);
    expect(
      within(actions.getByRole("button", { name: en.playlist.play })).getByText(en.playlist.play),
    ).toBeTruthy();
  });

  it("shows Pause on the liked play pill while the list plays", async () => {
    mockParams = { id: "liked", source: "liked" };
    const ctx = await setup({ listLikedTracks: tracksOf(two) });
    await screen.findByText("First Song");
    await fireEvent.press(screen.getByRole("button", { name: en.playlist.play }));
    await waitFor(() => {
      expect(ids(ctx)).toEqual(["t1", "t2"]);
    });
    await playingEvent(ctx);
    const pause = screen.getByRole("button", { name: en.playlist.pause });
    expect(within(pause).getByText(en.playlist.pause)).toBeTruthy();
    await fireEvent.press(pause);
    await waitFor(() => {
      expect(ctx.playback.getState().status).toBe("paused");
    });
    expect(
      within(screen.getByRole("button", { name: en.playlist.play })).getByText(en.playlist.play),
    ).toBeTruthy();
  });

  it("plays a genre playlist whole from its header", async () => {
    mockParams = { id: "gp1", source: "genre" };
    const ctx = await setup({
      getGenrePlaylist: detail({ ...publicGenrePlaylistFixture, tracks: [first, second, third] }),
    });
    await screen.findByText("First Song");
    await fireEvent.press(screen.getByRole("button", { name: en.playlist.play }));
    await waitFor(() => {
      expect(ids(ctx)).toEqual(["t1", "t2", "t3"]);
    });
    expect(ctx.playback.getState().current?.trackId).toBe("t1");
    expect(ctx.listPlaylistTracks).not.toHaveBeenCalled();
  });

  it("shuffles an own playlist whole from a random track after loading its pages", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0.99);
    const ctx = await setup({
      listPlaylistTracks: (_id, cursor) => twoPages(secondPageOk)(cursor),
    });
    await screen.findByText("First Song");
    await fireEvent.press(screen.getByRole("button", { name: en.playlist.shuffle }));
    await waitFor(() => {
      expect(ctx.playback.getState().queue).toHaveLength(4);
    });
    const state = ctx.playback.getState();
    expect(state.shuffle).toBe(true);
    expect(state.current?.trackId).toBe("t4");
    expect(new Set(ids(ctx))).toEqual(new Set(["t1", "t2", "t3", "t4"]));
  });

  it("shuffles the liked playlist from a random track", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0.99);
    mockParams = { id: "liked", source: "liked" };
    const ctx = await setup({ listLikedTracks: tracksOf(two) });
    await screen.findByText("First Song");
    await fireEvent.press(screen.getByRole("button", { name: en.playlist.shuffle }));
    await waitFor(() => {
      expect(ctx.playback.getState().current?.trackId).toBe("t2");
    });
    expect(ctx.playback.getState().shuffle).toBe(true);
  });

  it("shuffles a genre playlist from a random track", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0.99);
    mockParams = { id: "gp1", source: "genre" };
    const ctx = await setup({
      getGenrePlaylist: detail({ ...publicGenrePlaylistFixture, tracks: [first, second, third] }),
    });
    await screen.findByText("First Song");
    await fireEvent.press(screen.getByRole("button", { name: en.playlist.shuffle }));
    await waitFor(() => {
      expect(ctx.playback.getState().current?.trackId).toBe("t3");
    });
    expect(ctx.playback.getState().shuffle).toBe(true);
  });

  it("plays from the first track with shuffle off after another list was shuffled", async () => {
    const ctx = makeCore({ listPlaylistTracks: tracksOf(two) });
    ctx.playback.setShuffle(true);
    await ctx.playback.playList([otherTrack], 0, { kind: "album", id: "other", name: "Other" });
    await render(
      <Wrapper core={ctx.core}>
        <SafeAreaProvider initialMetrics={metrics}>
          <PlaylistScreen />
        </SafeAreaProvider>
      </Wrapper>,
    );
    await screen.findByText("First Song");
    await fireEvent.press(screen.getByRole("button", { name: en.playlist.play }));
    await waitFor(() => {
      expect(ctx.playback.getState().source?.kind).toBe("playlist");
    });
    const state = ctx.playback.getState();
    expect(state.shuffle).toBe(false);
    expect(state.current?.trackId).toBe("t1");
    expect(ids(ctx)).toEqual(["t1", "t2"]);
  });

  it("registers the playlist as a recent when play or shuffle starts it", async () => {
    const ctx = await setup({ listPlaylistTracks: tracksOf(two) });
    await screen.findByText("maxi_23");
    const body = {
      entity_type: "playlist",
      entity_id: "p1",
      metadata: {
        title: "Road trip",
        subtitle: "maxi_23",
        thumbnail_url: "test://img/1",
        kind: "user",
      },
    };
    await fireEvent.press(screen.getByRole("button", { name: en.playlist.play }));
    await waitFor(() => {
      expect(ctx.registerRecent).toHaveBeenCalledTimes(1);
    });
    expect(ctx.registerRecent).toHaveBeenLastCalledWith(body);
    await fireEvent.press(screen.getByRole("button", { name: en.playlist.shuffle }));
    await waitFor(() => {
      expect(ctx.registerRecent).toHaveBeenCalledTimes(2);
    });
    expect(ctx.registerRecent).toHaveBeenLastCalledWith(body);
  });

  it("shows the pressed button busy until every page loads", async () => {
    let release: (outcome: HttpOutcome<PageResult<PlaylistTrack>>) => void = () => undefined;
    const pending = new Promise<HttpOutcome<PageResult<PlaylistTrack>>>((resolve) => {
      release = resolve;
    });
    const ctx = await setup({
      listPlaylistTracks: (_id, cursor) => twoPages(() => pending)(cursor),
    });
    await screen.findByText("First Song");
    await fireEvent.press(screen.getByRole("button", { name: en.playlist.play }));
    await waitFor(() => {
      expect(stateFlag(screen.getByRole("button", { name: en.playlist.play }), "busy")).toBe(true);
    });
    expect(stateFlag(screen.getByRole("button", { name: en.playlist.play }), "disabled")).toBe(
      true,
    );
    expect(stateFlag(screen.getByRole("button", { name: en.playlist.shuffle }), "disabled")).toBe(
      true,
    );
    expect(ctx.playback.getState().queue).toEqual([]);
    await act(async () => {
      release(pageOf([third, fourth]));
      await pending;
    });
    await waitFor(() => {
      expect(ids(ctx)).toEqual(["t1", "t2", "t3", "t4"]);
    });
    expect(stateFlag(screen.getByRole("button", { name: en.playlist.play }), "busy")).toBe(true);
    await playingEvent(ctx);
    expect(stateFlag(screen.getByRole("button", { name: en.playlist.pause }), "busy")).toBe(false);
  });

  it("goes idle, loading, playing, then pauses and resumes a genre playlist", async () => {
    mockParams = { id: "gp1", source: "genre" };
    const ctx = await setup({
      getGenrePlaylist: detail({ ...publicGenrePlaylistFixture, tracks: two }),
    });
    await screen.findByText("First Song");
    const idle = screen.getByRole("button", { name: en.playlist.play });
    expect(within(idle).getByText(en.playlist.play)).toBeTruthy();
    // The label fade and the shrink finish at once; the spinner comes after them.
    jest.spyOn(Animated, "timing").mockImplementationOnce(instant).mockImplementationOnce(instant);
    await fireEvent.press(idle);
    expect(
      within(screen.getByRole("button", { name: en.playlist.play })).getByTestId(
        "play-button-busy",
      ),
    ).toBeTruthy();
    await playingEvent(ctx);
    const pause = screen.getByRole("button", { name: en.playlist.pause });
    expect(within(pause).getByTestId("play-button-pause")).toBeTruthy();
    await fireEvent.press(pause);
    await waitFor(() => {
      expect(ctx.playback.getState().status).toBe("paused");
    });
    expect(ctx.player.port.pause).toHaveBeenCalled();
    ctx.player.port.play.mockClear();
    await fireEvent.press(screen.getByRole("button", { name: en.playlist.play }));
    await waitFor(() => {
      expect(ctx.playback.getState().status).toBe("playing");
    });
    expect(ctx.player.port.play).toHaveBeenCalled();
  });

  it("loads every page, then plays, then pauses an own playlist", async () => {
    const ctx = await setup({
      listPlaylistTracks: (_id, cursor) => twoPages(secondPageOk)(cursor),
    });
    await screen.findByText("First Song");
    await fireEvent.press(screen.getByRole("button", { name: en.playlist.play }));
    await waitFor(() => {
      expect(ids(ctx)).toEqual(["t1", "t2", "t3", "t4"]);
    });
    await playingEvent(ctx);
    await fireEvent.press(screen.getByRole("button", { name: en.playlist.pause }));
    await waitFor(() => {
      expect(ctx.playback.getState().status).toBe("paused");
    });
    expect(ctx.player.port.pause).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: en.playlist.play })).toBeTruthy();
  });

  it("marks every row of the playing track, a duplicate included", async () => {
    const again: PlaylistTrack = { ...first, position: 3 };
    const ctx = await setup({ listPlaylistTracks: tracksOf([first, second, again]) });
    await screen.findByText("Second Song");
    await fireEvent.press(screen.getByRole("button", { name: en.playlist.play }));
    await waitFor(() => {
      expect(ctx.playback.getState().current?.trackId).toBe("t1");
    });
    await playingEvent(ctx);
    const rows = screen.getAllByTestId("playlist-track");
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => within(row).queryByTestId("now-playing-bars") !== null)).toEqual([
      true,
      false,
      true,
    ]);
  });

  it("draws the whole-body error and starts nothing when a page fails", async () => {
    const ctx = await setup({
      listPlaylistTracks: (_id, cursor) =>
        twoPages(() => Promise.resolve<HttpOutcome<PageResult<PlaylistTrack>>>(upstream))(cursor),
    });
    await screen.findByText("First Song");
    await fireEvent.press(screen.getByRole("button", { name: en.playlist.play }));
    expect(await screen.findByText(en.common.error.generic)).toBeTruthy();
    expect(screen.getByRole("button", { name: en.common.retry })).toBeTruthy();
    expect(ctx.playback.getState().queue).toEqual([]);
  });

  it("starts nothing when the screen is left while the pages load", async () => {
    let release: (outcome: HttpOutcome<PageResult<PlaylistTrack>>) => void = () => undefined;
    const pending = new Promise<HttpOutcome<PageResult<PlaylistTrack>>>((resolve) => {
      release = resolve;
    });
    const ctx = makeCore({
      listPlaylistTracks: (_id, cursor) => twoPages(() => pending)(cursor),
    });
    const view = await render(
      <Wrapper core={ctx.core}>
        <SafeAreaProvider initialMetrics={metrics}>
          <PlaylistScreen />
        </SafeAreaProvider>
      </Wrapper>,
    );
    await screen.findByText("First Song");
    await fireEvent.press(screen.getByRole("button", { name: en.playlist.play }));
    await waitFor(() => {
      expect(ctx.listPlaylistTracks).toHaveBeenCalledWith("p1", "c1");
    });
    await view.unmount();
    await act(async () => {
      release(pageOf([third, fourth]));
      await pending;
    });
    expect(ctx.playback.getState().queue).toEqual([]);
    expect(ctx.player.port.load).not.toHaveBeenCalled();
    expect(ctx.registerRecent).not.toHaveBeenCalled();
  });

  it("disables play and shuffle for an empty playlist", async () => {
    const ctx = await setup();
    await screen.findByText(en.playlist.empty);
    for (const name of [en.playlist.play, en.playlist.shuffle]) {
      const button = screen.getByRole("button", { name });
      expect(stateFlag(button, "disabled")).toBe(true);
      await fireEvent.press(button);
    }
    expect(ctx.playback.getState().queue).toEqual([]);
  });
});

describe("PlaylistScreen save", () => {
  const savedState = (saved: boolean) => () =>
    Promise.resolve<HttpOutcome<{ saved: boolean }>>({
      kind: "success",
      data: { saved },
      maxAgeSeconds: 0,
    });

  it("draws no save button on an own or the liked playlist and never reads the state", async () => {
    const own = await setup({ listPlaylistTracks: tracksOf(two) });
    await screen.findByText("First Song");
    expect(screen.queryByRole("button", { name: en.playlist.save })).toBeNull();
    expect(screen.queryByRole("button", { name: en.playlist.unsave })).toBeNull();
    expect(own.getSavedState).not.toHaveBeenCalled();
  });

  it("draws no save button on the liked playlist", async () => {
    mockParams = { id: "liked", source: "liked" };
    const ctx = await setup({ listLikedTracks: tracksOf(two) });
    await screen.findByText("First Song");
    expect(screen.queryByRole("button", { name: en.playlist.save })).toBeNull();
    expect(screen.queryByRole("button", { name: en.playlist.unsave })).toBeNull();
    expect(ctx.getSavedState).not.toHaveBeenCalled();
  });

  it("draws a saved genre playlist as saved", async () => {
    mockParams = { id: "gp1", source: "genre" };
    const ctx = await setup({ getSavedState: savedState(true) });
    const button = await screen.findByRole("button", { name: en.playlist.unsave });
    expect(stateFlag(button, "selected")).toBe(true);
    expect(ctx.getSavedState).toHaveBeenCalledWith("playlist", "gp1");
  });

  it("saves a genre playlist with its body", async () => {
    mockParams = { id: "gp1", source: "genre" };
    const ctx = await setup({
      getSavedState: jest
        .fn<() => ReturnType<ReturnType<typeof savedState>>>()
        .mockImplementationOnce(savedState(false))
        .mockImplementation(savedState(true)),
    });
    await fireEvent.press(await screen.findByRole("button", { name: en.playlist.save }));
    expect(ctx.saveItem).toHaveBeenCalledWith({
      kind: "playlist",
      source: "genre",
      external_id: "gp1",
      title: "Pop hits",
      thumbnail_url: "test://img/1",
    });
    expect(await screen.findByRole("button", { name: en.playlist.unsave })).toBeTruthy();
  });

  it("removes a saved genre playlist", async () => {
    mockParams = { id: "gp1", source: "genre" };
    const ctx = await setup({
      getSavedState: jest
        .fn<() => ReturnType<ReturnType<typeof savedState>>>()
        .mockImplementationOnce(savedState(true))
        .mockImplementation(savedState(false)),
    });
    await fireEvent.press(await screen.findByRole("button", { name: en.playlist.unsave }));
    expect(ctx.removeItem).toHaveBeenCalledWith("playlist", "gp1");
    expect(await screen.findByRole("button", { name: en.playlist.save })).toBeTruthy();
  });

  it("rolls the save button back when the save fails", async () => {
    mockParams = { id: "gp1", source: "genre" };
    // The refetch after the failure never answers, so the label returns by the rollback alone.
    const ctx = await setup({
      getSavedState: jest
        .fn<() => ReturnType<ReturnType<typeof savedState>>>()
        .mockImplementationOnce(savedState(false))
        .mockImplementation(() => new Promise(() => undefined)),
      saveItem: () => Promise.resolve({ kind: "api_failure", reason: "upstream_error" }),
    });
    await fireEvent.press(await screen.findByRole("button", { name: en.playlist.save }));
    await waitFor(() => {
      expect(ctx.log.warn).toHaveBeenCalledWith("library.save_failed", {
        kind: "playlist",
        detail: "upstream_error",
      });
    });
    expect(await screen.findByRole("button", { name: en.playlist.save })).toBeTruthy();
  });

  it("disables save while its state loads", async () => {
    mockParams = { id: "gp1", source: "genre" };
    await setup({ getSavedState: () => new Promise(() => undefined) });
    await screen.findByTestId("playlist-info");
    expect(stateFlag(screen.getByRole("button", { name: en.playlist.save }), "disabled")).toBe(
      true,
    );
  });

  it("disables save and draws the rest when its state fails", async () => {
    mockParams = { id: "gp1", source: "genre" };
    await setup({
      getSavedState: () => Promise.resolve({ kind: "api_failure", reason: "upstream_error" }),
    });
    await screen.findByTestId("playlist-info");
    await waitFor(() => {
      expect(stateFlag(screen.getByRole("button", { name: en.playlist.save }), "disabled")).toBe(
        true,
      );
    });
    expect(screen.queryByText(en.common.error.generic)).toBeNull();
  });
});

describe("PlaylistScreen own playlist options", () => {
  const optionsButton = () => screen.getByRole("button", { name: en.playlist.options.more });
  const openOptions = async () => {
    await screen.findByText("First Song");
    await fireEvent.press(optionsButton());
  };
  const openEdit = async () => {
    await openOptions();
    await fireEvent.press(screen.getByRole("button", { name: en.playlist.options.items.edit }));
  };
  const save = () => screen.getByRole("button", { name: en.playlist.edit.submit });
  const nameField = () => screen.getByLabelText(en.playlist.edit.name);
  const descriptionField = () => screen.getByLabelText(en.playlist.edit.description);

  it("draws the options button after play on an own playlist", async () => {
    await setup({ listPlaylistTracks: tracksOf(two) });
    await screen.findByText("First Song");
    const labels = within(screen.getByTestId("playlist-actions"))
      .getAllByRole("button")
      .map((button) => button.props.accessibilityLabel as unknown);
    expect(labels).toEqual([en.playlist.shuffle, en.playlist.play, en.playlist.options.more]);
  });

  it("draws no options button on the liked or a genre playlist", async () => {
    mockParams = { id: "liked", source: "liked" };
    await setup({ listLikedTracks: tracksOf(two) });
    await screen.findByText("First Song");
    expect(screen.queryByRole("button", { name: en.playlist.options.more })).toBeNull();
    await screen.unmount();
    mockParams = { id: "gp1", source: "genre" };
    await setup({ getGenrePlaylist: detail({ ...publicGenrePlaylistFixture, tracks: two }) });
    await screen.findByText("First Song");
    expect(screen.queryByRole("button", { name: en.playlist.options.more })).toBeNull();
  });

  it("opens the options sheet with edit, edit tracks and delete, in that order", async () => {
    await setup({ listPlaylistTracks: tracksOf(two) });
    await openOptions();
    const sheet = screen.getByTestId("playlist-options-sheet");
    const labels = [
      en.playlist.options.items.edit,
      en.playlist.options.items.editTracks,
      en.playlist.options.items.delete,
    ];
    const shown = within(sheet)
      .getAllByText(new RegExp(`^(${labels.join("|")})$`))
      .map((node) => node.props.children as string);
    expect(shown).toEqual(labels);
  });

  it("edit tracks opens the edit mode of this playlist and asks nothing", async () => {
    const alert = jest.spyOn(Alert, "alert");
    await setup({ listPlaylistTracks: tracksOf(two) });
    await openOptions();
    await fireEvent.press(
      screen.getByRole("button", { name: en.playlist.options.items.editTracks }),
    );
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/playlist-edit/[id]",
      params: { id: "p1" },
    });
    expect(alert).not.toHaveBeenCalled();
    expect(screen.queryByTestId("playlist-options-sheet")).toBeNull();
  });

  it("prefills the edit sheet and keeps Save disabled until something changes", async () => {
    await setup({ listPlaylistTracks: tracksOf(two) });
    await openEdit();
    expect(nameField().props.value).toBe("Road trip");
    expect(descriptionField().props.value).toBe("Windows down");
    expect(stateFlag(save(), "disabled")).toBe(true);
    await fireEvent.changeText(nameField(), "Road trip 2");
    expect(stateFlag(save(), "disabled")).toBeFalsy();
  });

  it("disables Save and shows the length message for an empty or too long title", async () => {
    await setup({ listPlaylistTracks: tracksOf(two) });
    await openEdit();
    await fireEvent.changeText(nameField(), "   ");
    expect(stateFlag(save(), "disabled")).toBe(true);
    await fireEvent.changeText(nameField(), "a".repeat(201));
    expect(screen.getByText("Use 200 characters or fewer")).toBeTruthy();
    expect(stateFlag(save(), "disabled")).toBe(true);
  });

  it("sends only the changed title", async () => {
    const ctx = await setup({ listPlaylistTracks: tracksOf(two) });
    await openEdit();
    await fireEvent.changeText(nameField(), "  Renamed ");
    await fireEvent.press(save());
    await waitFor(() => {
      expect(ctx.updatePlaylist).toHaveBeenCalledWith("p1", { title: "Renamed" });
    });
  });

  it("sends an emptied description as null", async () => {
    const ctx = await setup({ listPlaylistTracks: tracksOf(two) });
    await openEdit();
    await fireEvent.changeText(descriptionField(), "  ");
    await fireEvent.press(save());
    await waitFor(() => {
      expect(ctx.updatePlaylist).toHaveBeenCalledWith("p1", { description: null });
    });
  });

  it("keeps the sheet open with the error and the input when the save fails", async () => {
    await setup({
      listPlaylistTracks: tracksOf(two),
      updatePlaylist: () => Promise.resolve(notFound),
    });
    await openEdit();
    await fireEvent.changeText(nameField(), "Renamed");
    await fireEvent.press(save());
    expect(await screen.findByText(en.common.error.generic)).toBeTruthy();
    expect(nameField().props.value).toBe("Renamed");
    expect(screen.getByRole("button", { name: en.playlist.edit.submit })).toBeTruthy();
  });

  it("closes the sheet and draws the new title after a save", async () => {
    let reads = 0;
    const ctx = await setup({
      listPlaylistTracks: tracksOf(two),
      getPlaylist: () => {
        reads += 1;
        return detail(
          reads === 1 ? playlistDetailFixture : { ...playlistDetailFixture, title: "Renamed" },
        )();
      },
    });
    await openEdit();
    await fireEvent.changeText(nameField(), "Renamed");
    await fireEvent.press(save());
    await waitFor(() => {
      expect(screen.queryByLabelText(en.playlist.edit.name)).toBeNull();
    });
    expect((await screen.findAllByText("Renamed")).length).toBeGreaterThan(0);
    expect(ctx.registerRecent).not.toHaveBeenCalled();
  });

  it("shows a saved rename as the player's source and keeps the queue", async () => {
    const ctx = await setup({
      listPlaylistTracks: tracksOf(two),
      updatePlaylist: () =>
        Promise.resolve({
          kind: "success",
          data: { ...createdPlaylistFixture, id: "p1", title: "Renamed" },
          maxAgeSeconds: 0,
        }),
    });
    await screen.findByText("First Song");
    await fireEvent.press(screen.getByRole("button", { name: en.playlist.play }));
    await waitFor(() => {
      expect(ctx.playback.getState().queue.length).toBe(2);
    });
    await playingEvent(ctx);
    const before = ctx.playback.getState();
    ctx.player.port.unload.mockClear();
    ctx.player.port.load.mockClear();
    ctx.player.port.pause.mockClear();
    await openEdit();
    await fireEvent.changeText(nameField(), "Renamed");
    await fireEvent.press(save());
    await waitFor(() => {
      expect(screen.queryByLabelText(en.playlist.edit.name)).toBeNull();
    });
    const after = ctx.playback.getState();
    expect(after.source).toEqual({ ...before.source, name: "Renamed" });
    expect(after.queue).toBe(before.queue);
    expect(after.status).toBe(before.status);
    expect(ctx.player.port.unload).not.toHaveBeenCalled();
    expect(ctx.player.port.load).not.toHaveBeenCalled();
    expect(ctx.player.port.pause).not.toHaveBeenCalled();
  });

  const confirmation = (alert: jest.SpiedFunction<typeof Alert.alert>) => {
    const call = alert.mock.calls[0];
    if (call === undefined) throw new Error("no confirmation");
    const [title, , buttons] = call;
    if (buttons === undefined) throw new Error("no buttons");
    const find = (style: "cancel" | "destructive") => buttons.find((b) => b.style === style);
    return { title, cancel: find("cancel"), confirm: find("destructive") };
  };

  const chooseDelete = async () => {
    await openOptions();
    await fireEvent.press(screen.getByRole("button", { name: en.playlist.options.items.delete }));
  };

  it("asks before deleting and does nothing on cancel", async () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    const ctx = await setup({ listPlaylistTracks: tracksOf(two) });
    await chooseDelete();
    const { title, cancel, confirm } = confirmation(alert);
    expect(title).toBe("Delete “Road trip”?");
    expect(confirm).toBeDefined();
    cancel?.onPress?.();
    expect(ctx.deletePlaylist).not.toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("deletes and goes back on confirm", async () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    const ctx = await setup({ listPlaylistTracks: tracksOf(two) });
    await chooseDelete();
    await act(() => {
      confirmation(alert).confirm?.onPress?.();
    });
    await waitFor(() => {
      expect(mockBack).toHaveBeenCalled();
    });
    expect(ctx.deletePlaylist).toHaveBeenCalledWith("p1");
    expect(ctx.registerRecent).not.toHaveBeenCalled();
  });

  it("replaces with / on confirm when there is nothing to go back to", async () => {
    mockCanGoBack = false;
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    await setup({ listPlaylistTracks: tracksOf(two) });
    await chooseDelete();
    await act(() => {
      confirmation(alert).confirm?.onPress?.();
    });
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/");
    });
  });

  it("shows the error notice and stays when the delete fails", async () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    await setup({
      listPlaylistTracks: tracksOf(two),
      deletePlaylist: () => Promise.resolve(upstream),
    });
    await chooseDelete();
    await act(() => {
      confirmation(alert).confirm?.onPress?.();
    });
    const notice = await screen.findByTestId("playlist-notice");
    expect(within(notice).getByText(en.common.error.generic)).toBeTruthy();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("keeps playing the playlist's queue after deleting it", async () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    const ctx = await setup({ listPlaylistTracks: tracksOf(two) });
    await screen.findByText("First Song");
    await fireEvent.press(screen.getByRole("button", { name: en.playlist.play }));
    await waitFor(() => {
      expect(ctx.playback.getState().queue.length).toBe(2);
    });
    await playingEvent(ctx);
    const before = ctx.playback.getState();
    ctx.player.port.unload.mockClear();
    ctx.player.port.pause.mockClear();
    await chooseDelete();
    await act(() => {
      confirmation(alert).confirm?.onPress?.();
    });
    await waitFor(() => {
      expect(mockBack).toHaveBeenCalled();
    });
    const after = ctx.playback.getState();
    expect(after.queue).toBe(before.queue);
    expect(after.source).toEqual(before.source);
    expect(after.status).toBe(before.status);
    expect(ctx.player.port.unload).not.toHaveBeenCalled();
    expect(ctx.player.port.pause).not.toHaveBeenCalled();
  });
});

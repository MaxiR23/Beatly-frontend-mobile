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
// - the skeleton, back and its fallback, es
//
// Run with: pnpm --filter @beatly/mobile test -- PlaylistScreen
//
// SEE: apps/mobile/src/screens/playlist/PlaylistScreen.tsx

import type { HttpOutcome, PageResult, PlaylistTrack } from "@beatly/core";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { i18n } from "../../../src/adapters/i18n.ts";
import { resources } from "../../../src/i18n/resources.ts";
import { PlaylistScreen } from "../../../src/screens/playlist/PlaylistScreen.tsx";
import {
  likedDetailFixture,
  makeCore,
  pageOf,
  playlistDetailFixture,
  playlistTrackFixture,
  profileFixture,
  publicGenrePlaylistFixture,
  successOf,
  Wrapper,
} from "../../helpers/core.tsx";

const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;
let mockParams: Record<string, string | undefined> = { id: "p1", source: "user" };
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace, canGoBack: () => mockCanGoBack }),
  useLocalSearchParams: () => mockParams,
}));
jest.mock("../../../src/adapters/imageColors.ts", () => ({
  getDominantColor: () => Promise.resolve({ kind: "unavailable" }),
  peekDominantColor: () => undefined,
}));

afterEach(async () => {
  mockBack.mockClear();
  mockReplace.mockClear();
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

  it("draws back, the rows and one more button per row", async () => {
    await setup({ listPlaylistTracks: tracksOf(two) });
    await screen.findByText("First Song");
    const names = screen.getAllByRole("button").map((b) => b.props.accessibilityLabel as unknown);
    expect(new Set(names)).toEqual(
      new Set([en.playlist.back, "First Song", "Second Song", en.trackMenu.more]),
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

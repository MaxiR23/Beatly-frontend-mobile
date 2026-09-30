// apps/mobile/test/app/(tabs)/(home,explore,search,library)/_layout.test.tsx
//
// Tests for the stack shared by the four tabs.
//
// Tested:
// - the shared stack: a tab's root and the detail routes pushed over it
//
// What is covered:
// - opening a genre from explore and going back
// - opening an album from home recents, a search result, a saved album and the explore stack, back returning to the same tab
// - opening a playlist recent from home, an own playlist from home, liked and a saved genre playlist from library, and a genre playlist from the genre grid, back returning to the origin
// - opening another album from an album's carousel and going back to the first album
// - opening an artist from the search top artist, a home artist recent and an album's artist name, and a similar artist from an artist, back returning to the origin
//
// Setup:
// - a beforeAll pays the cold start of the whole route tree once, outside the per-test budget
//
// Run with: pnpm --filter @beatly/mobile test -- "(home,explore,search,library)/_layout"
//
// SEE: apps/mobile/app/(tabs)/(home,explore,search,library)/_layout.tsx

import { beforeAll, describe, expect, it, jest } from "@jest/globals";
import { router } from "expo-router";
import { act, cleanup, fireEvent, renderRouter, screen } from "expo-router/testing-library";

import { resources } from "../../../../src/i18n/resources.ts";
import {
  albumFixture,
  artistFixture,
  genreFixture,
  genrePlaylistFixture,
  likedEntryFixture,
  pageOf,
  playlistFixture,
  recentFixture,
  savedAlbumEntryFixture,
  savedPlaylistEntryFixture,
} from "../../../helpers/core.tsx";
import { installCore } from "../../../helpers/routeCore.ts";

jest.mock("../../../../src/createCore.ts", () => ({ createCore: () => mockCore.current }));
jest.mock("../../../../src/adapters/imageColors.ts", () => ({
  getDominantColor: () => Promise.resolve({ kind: "unavailable" }),
  peekDominantColor: () => undefined,
}));
const mockCore = installCore();

const en = resources.en;

function isSelected(node: { props: unknown }): unknown {
  const props = node.props as { accessibilityState?: { selected?: unknown } };
  return props.accessibilityState?.selected;
}

function backButton() {
  return screen.getByRole("button", { name: en.album.back });
}

describe("the shared tab stack", () => {
  // Cold start of the whole route tree (transform and require of every route, screen and ui
  // module): measured 12 s cold locally and over the 15 s test budget on CI on 2026-09-30. Paid
  // here so every test keeps the 15 s budget that exposes a real hang; otherwise the first test
  // times out and the second fails as fallout of the first one's pending presses.
  beforeAll(async () => {
    mockCore.set("signed_in");
    await renderRouter("app", { initialUrl: "/" });
    await screen.findByTestId("home");
    await cleanup();
  }, 60_000);

  it("opens a genre from explore and goes back", async () => {
    mockCore.set("signed_in", { listGenres: () => Promise.resolve(pageOf([genreFixture])) });
    await renderRouter("app", { initialUrl: "/" });
    await screen.findByTestId("home");
    await fireEvent.press(screen.getByRole("tab", { name: en.tabs.explore }));
    await screen.findByTestId("explore");
    await fireEvent.press(await screen.findByRole("button", { name: "Pop" }));
    const genre = await screen.findByTestId("genre");
    expect(genre).toBeTruthy();
    expect(screen.getByText("Pop")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: en.genre.back }));
    expect(await screen.findByTestId("explore")).toBeTruthy();
  });

  it("opens an album from home recents and back returns to home with home selected", async () => {
    mockCore.set("signed_in", { listRecents: () => Promise.resolve(pageOf([recentFixture])) });
    await renderRouter("app", { initialUrl: "/" });
    await fireEvent.press(await screen.findByRole("button", { name: "Recent album" }));
    expect(await screen.findByTestId("album")).toBeTruthy();
    expect((await screen.findAllByText("Test Album")).length).toBeGreaterThan(0);
    await fireEvent.press(backButton());
    expect(await screen.findByTestId("home")).toBeTruthy();
    expect(isSelected(screen.getByRole("tab", { name: en.tabs.home }))).toBe(true);
  });

  it("opens an album from a search result and back returns to search with search selected", async () => {
    mockCore.set("signed_in");
    await renderRouter("app", { initialUrl: "/" });
    await screen.findByTestId("home");
    await fireEvent.press(screen.getByRole("tab", { name: en.tabs.search }));
    await screen.findByTestId("search");
    await fireEvent.changeText(screen.getByPlaceholderText(en.search.placeholder), "test");
    await fireEvent.press(await screen.findByRole("button", { name: "Test Album" }));
    expect(await screen.findByTestId("album")).toBeTruthy();
    await fireEvent.press(backButton());
    expect(await screen.findByTestId("search")).toBeTruthy();
    expect(isSelected(screen.getByRole("tab", { name: en.tabs.search }))).toBe(true);
  });

  it("opens an album from a saved album in library and back returns to library", async () => {
    mockCore.set("signed_in", {
      listLibrary: () => Promise.resolve(pageOf([savedAlbumEntryFixture])),
    });
    await renderRouter("app", { initialUrl: "/" });
    await screen.findByTestId("home");
    await fireEvent.press(screen.getByRole("tab", { name: en.tabs.library }));
    await fireEvent.press(await screen.findByRole("button", { name: "Saved album" }));
    expect(await screen.findByTestId("album")).toBeTruthy();
    await fireEvent.press(backButton());
    expect(await screen.findByTestId("library")).toBeTruthy();
    expect(isSelected(screen.getByRole("tab", { name: en.tabs.library }))).toBe(true);
  });

  it("opens an album from the explore tab's stack and keeps explore selected", async () => {
    mockCore.set("signed_in");
    await renderRouter("app", { initialUrl: "/" });
    await screen.findByTestId("home");
    await fireEvent.press(screen.getByRole("tab", { name: en.tabs.explore }));
    await screen.findByTestId("explore");
    await act(async () => {
      router.push({ pathname: "/album/[id]", params: { id: "MPREb_1" } });
      await Promise.resolve();
    });
    expect(await screen.findByTestId("album")).toBeTruthy();
    expect(isSelected(screen.getByRole("tab", { name: en.tabs.explore }))).toBe(true);
    await fireEvent.press(backButton());
    expect(await screen.findByTestId("explore")).toBeTruthy();
  });

  it("opens another album from an album's carousel and back returns to the first album", async () => {
    mockCore.set("signed_in", {
      getAlbum: (id) =>
        Promise.resolve({
          kind: "success",
          maxAgeSeconds: 0,
          data:
            id === "MPREb_2"
              ? { ...albumFixture, id, title: "Second Album", other_versions: [] }
              : albumFixture,
        }),
    });
    await renderRouter("app", { initialUrl: "/" });
    await screen.findByTestId("home");
    await act(async () => {
      router.push({ pathname: "/album/[id]", params: { id: "MPREb_1" } });
      await Promise.resolve();
    });
    await fireEvent.press(await screen.findByRole("button", { name: "Other Version" }));
    expect((await screen.findAllByText("Second Album")).length).toBeGreaterThan(0);
    await fireEvent.press(backButton());
    expect((await screen.findAllByText("Test Album")).length).toBeGreaterThan(0);
    expect(screen.queryByText("Second Album")).toBeNull();
  });

  function playlistBack() {
    return screen.getByRole("button", { name: en.playlist.back });
  }

  it("opens an own playlist from home and back returns to home with home selected", async () => {
    mockCore.set("signed_in", { listPlaylists: () => Promise.resolve(pageOf([playlistFixture])) });
    await renderRouter("app", { initialUrl: "/" });
    await fireEvent.press(await screen.findByRole("button", { name: "Road trip" }));
    expect(await screen.findByTestId("playlist")).toBeTruthy();
    await fireEvent.press(playlistBack());
    expect(await screen.findByTestId("home")).toBeTruthy();
    expect(isSelected(screen.getByRole("tab", { name: en.tabs.home }))).toBe(true);
  });

  it("opens a playlist recent from home and back returns to home with home selected", async () => {
    mockCore.set("signed_in", {
      listRecents: () =>
        Promise.resolve(
          pageOf([
            {
              ...recentFixture,
              entity_type: "playlist",
              entity_id: "p1",
              metadata: { title: "A playlist", kind: "user" },
            },
          ]),
        ),
    });
    await renderRouter("app", { initialUrl: "/" });
    await fireEvent.press(await screen.findByRole("button", { name: "A playlist" }));
    expect(await screen.findByTestId("playlist")).toBeTruthy();
    await fireEvent.press(playlistBack());
    expect(await screen.findByTestId("home")).toBeTruthy();
    expect(isSelected(screen.getByRole("tab", { name: en.tabs.home }))).toBe(true);
  });

  it("opens liked from library and back returns to library", async () => {
    mockCore.set("signed_in", { listLibrary: () => Promise.resolve(pageOf([likedEntryFixture])) });
    await renderRouter("app", { initialUrl: "/" });
    await screen.findByTestId("home");
    await fireEvent.press(screen.getByRole("tab", { name: en.tabs.library }));
    await fireEvent.press(await screen.findByRole("button", { name: en.library.liked }));
    expect(await screen.findByTestId("playlist")).toBeTruthy();
    expect(await screen.findByText(en.playlist.liked)).toBeTruthy();
    await fireEvent.press(playlistBack());
    expect(await screen.findByTestId("library")).toBeTruthy();
    expect(isSelected(screen.getByRole("tab", { name: en.tabs.library }))).toBe(true);
  });

  it("opens a saved genre playlist from library and back returns to library", async () => {
    mockCore.set("signed_in", {
      listLibrary: () => Promise.resolve(pageOf([savedPlaylistEntryFixture])),
    });
    await renderRouter("app", { initialUrl: "/" });
    await screen.findByTestId("home");
    await fireEvent.press(screen.getByRole("tab", { name: en.tabs.library }));
    await fireEvent.press(await screen.findByRole("button", { name: "Saved playlist" }));
    expect(await screen.findByTestId("playlist")).toBeTruthy();
    expect((await screen.findAllByText("Pop hits")).length).toBeGreaterThan(0);
    await fireEvent.press(playlistBack());
    expect(await screen.findByTestId("library")).toBeTruthy();
  });

  it("opens a genre playlist from the genre grid and back returns to the genre in explore", async () => {
    mockCore.set("signed_in", {
      listGenres: () => Promise.resolve(pageOf([genreFixture])),
      listGenrePlaylists: () => Promise.resolve(pageOf([genrePlaylistFixture])),
    });
    await renderRouter("app", { initialUrl: "/" });
    await screen.findByTestId("home");
    await fireEvent.press(screen.getByRole("tab", { name: en.tabs.explore }));
    await fireEvent.press(await screen.findByRole("button", { name: "Pop" }));
    await screen.findByTestId("genre");
    await fireEvent.press(await screen.findByRole("button", { name: /Pop hits/ }));
    expect(await screen.findByTestId("playlist")).toBeTruthy();
    await fireEvent.press(playlistBack());
    expect(await screen.findByTestId("genre")).toBeTruthy();
    expect(isSelected(screen.getByRole("tab", { name: en.tabs.explore }))).toBe(true);
  });

  function artistBack() {
    return screen.getByRole("button", { name: en.artist.back });
  }

  it("opens an artist from the search top artist and back returns to search with search selected", async () => {
    mockCore.set("signed_in");
    await renderRouter("app", { initialUrl: "/" });
    await screen.findByTestId("home");
    await fireEvent.press(screen.getByRole("tab", { name: en.tabs.search }));
    await screen.findByTestId("search");
    await fireEvent.changeText(screen.getByPlaceholderText(en.search.placeholder), "test");
    await fireEvent.press(await screen.findByRole("button", { name: "Test Artist" }));
    expect(await screen.findByTestId("artist")).toBeTruthy();
    await fireEvent.press(artistBack());
    expect(await screen.findByTestId("search")).toBeTruthy();
    expect(isSelected(screen.getByRole("tab", { name: en.tabs.search }))).toBe(true);
  });

  it("opens an artist recent from home and back returns to home with home selected", async () => {
    mockCore.set("signed_in", {
      listRecents: () =>
        Promise.resolve(
          pageOf([
            {
              ...recentFixture,
              entity_type: "artist",
              entity_id: "UCar1",
              metadata: { title: "A recent artist", subtitle: null, thumbnail_url: null },
            },
          ]),
        ),
    });
    await renderRouter("app", { initialUrl: "/" });
    await fireEvent.press(await screen.findByRole("button", { name: "A recent artist" }));
    expect(await screen.findByTestId("artist")).toBeTruthy();
    await fireEvent.press(artistBack());
    expect(await screen.findByTestId("home")).toBeTruthy();
    expect(isSelected(screen.getByRole("tab", { name: en.tabs.home }))).toBe(true);
  });

  it("opens an artist from an album's artist name and back returns to the album", async () => {
    mockCore.set("signed_in");
    await renderRouter("app", { initialUrl: "/" });
    await screen.findByTestId("home");
    await act(async () => {
      router.push({ pathname: "/album/[id]", params: { id: "MPREb_1" } });
      await Promise.resolve();
    });
    await fireEvent.press(await screen.findByRole("link", { name: "Test Artist" }));
    expect(await screen.findByTestId("artist")).toBeTruthy();
    await fireEvent.press(artistBack());
    expect(await screen.findByTestId("album")).toBeTruthy();
    expect((await screen.findAllByText("Test Album")).length).toBeGreaterThan(0);
  });

  it("opens a similar artist from an artist and back returns to the first artist", async () => {
    mockCore.set("signed_in", {
      getArtist: (id) =>
        Promise.resolve({
          kind: "success",
          maxAgeSeconds: 0,
          data:
            id === "UCar2"
              ? { ...artistFixture, id, name: "Second Artist", related: [] }
              : artistFixture,
        }),
    });
    await renderRouter("app", { initialUrl: "/" });
    await screen.findByTestId("home");
    await act(async () => {
      router.push({ pathname: "/artist/[id]", params: { id: "UCar1" } });
      await Promise.resolve();
    });
    await fireEvent.press(await screen.findByRole("button", { name: "Similar Artist" }));
    expect((await screen.findAllByText("Second Artist")).length).toBeGreaterThan(0);
    await fireEvent.press(artistBack());
    expect((await screen.findAllByText("Test Artist")).length).toBeGreaterThan(0);
    expect(screen.queryByText("Second Artist")).toBeNull();
  });
});

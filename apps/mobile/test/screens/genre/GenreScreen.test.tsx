// apps/mobile/test/screens/genre/GenreScreen.test.tsx
//
// Tests for the genre screen.
//
// Tested:
// - GenreScreen
//
// What is covered:
// - loading, the grid, the category chips and the filter, the covers by the Home rule, the plural count
// - the empty genre, the empty category, the generic error with retry, back, the name from the route, en and es
//
// Run with: pnpm --filter @beatly/mobile test -- GenreScreen
//
// SEE: apps/mobile/src/screens/genre/GenreScreen.tsx

import type { GenrePlaylistListItem, HttpOutcome, PageResult } from "@beatly/core";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { i18n } from "../../../src/adapters/i18n.ts";
import { resources } from "../../../src/i18n/resources.ts";
import { GenreScreen } from "../../../src/screens/genre/GenreScreen.tsx";
import { genrePlaylistFixture, makeCore, pageOf, Wrapper } from "../../helpers/core.tsx";

const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;
let mockParams: Record<string, string | undefined> = { slug: "pop", name: "Pop" };
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace, canGoBack: () => mockCanGoBack }),
  useLocalSearchParams: () => mockParams,
}));

afterEach(async () => {
  mockBack.mockClear();
  mockReplace.mockClear();
  mockCanGoBack = true;
  mockParams = { slug: "pop", name: "Pop" };
  await i18n.changeLanguage("en");
});

const en = resources.en;

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

async function setup(options: Parameters<typeof makeCore>[0] = {}) {
  const ctx = makeCore(options);
  await render(
    <Wrapper core={ctx.core}>
      <SafeAreaProvider initialMetrics={metrics}>
        <GenreScreen />
      </SafeAreaProvider>
    </Wrapper>,
  );
  return ctx;
}

function playlistsOf(items: GenrePlaylistListItem[]) {
  return () => Promise.resolve(pageOf(items));
}

function categoriesOf(items: string[]) {
  return () => Promise.resolve(pageOf(items));
}

const hits = { ...genrePlaylistFixture, id: "h", title: "Hits one", category: "Hits" };
const chill = { ...genrePlaylistFixture, id: "c", title: "Chill one", category: "Chill" };
const none = { ...genrePlaylistFixture, id: "n", title: "No category", category: null };

const failure: HttpOutcome<PageResult<never>> = {
  kind: "api_failure",
  reason: "genre_not_found",
};

function chipLabels() {
  return screen
    .getAllByRole("button")
    .map((button) => button.props.accessibilityLabel as string)
    .filter((label) => label !== en.genre.back);
}

describe("GenreScreen", () => {
  it("draws the loading state while either list loads", async () => {
    await setup({
      listGenrePlaylists: playlistsOf([hits]),
      listGenreCategories: () => new Promise(() => undefined),
    });
    expect(screen.getByLabelText(en.common.loading)).toBeTruthy();
  });

  it("draws the genre name from the route", async () => {
    await setup();
    expect(screen.getByText("Pop")).toBeTruthy();
  });

  it("draws All first and then the categories in API order, All selected", async () => {
    await setup({
      listGenrePlaylists: playlistsOf([hits, chill]),
      listGenreCategories: categoriesOf(["Hits", "Chill"]),
    });
    await screen.findByText("Hits one");
    expect(chipLabels()).toEqual([en.genre.all, "Hits", "Chill"]);
    expect(screen.getByRole("button", { name: en.genre.all }).props.accessibilityState).toEqual({
      selected: true,
    });
  });

  it("filters the grid by the selected category and restores it with All", async () => {
    await setup({
      listGenrePlaylists: playlistsOf([hits, chill, none]),
      listGenreCategories: categoriesOf(["Hits", "Chill"]),
    });
    await screen.findByText("Hits one");
    expect(screen.getAllByText(/ one$|No category/)).toHaveLength(3);
    await fireEvent.press(screen.getByRole("button", { name: "Chill" }));
    expect(screen.getByText("Chill one")).toBeTruthy();
    expect(screen.queryByText("Hits one")).toBeNull();
    expect(screen.queryByText("No category")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: en.genre.all }));
    expect(screen.getAllByText(/ one$|No category/)).toHaveLength(3);
  });

  it("shows playlists without a category only under All", async () => {
    await setup({
      listGenrePlaylists: playlistsOf([hits, none]),
      listGenreCategories: categoriesOf(["Hits"]),
    });
    expect(await screen.findByText("No category")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Hits" }));
    expect(screen.queryByText("No category")).toBeNull();
  });

  it("draws the empty category message and keeps the chips", async () => {
    await setup({
      listGenrePlaylists: playlistsOf([hits]),
      listGenreCategories: categoriesOf(["Hits", "Live"]),
    });
    await screen.findByText("Hits one");
    await fireEvent.press(screen.getByRole("button", { name: "Live" }));
    expect(screen.getByText(en.genre.emptyCategory)).toBeTruthy();
    expect(chipLabels()).toEqual([en.genre.all, "Hits", "Live"]);
  });

  it("hides the chip row when the genre has no categories", async () => {
    await setup({ listGenrePlaylists: playlistsOf([hits]) });
    await screen.findByText("Hits one");
    expect(screen.queryByRole("button", { name: en.genre.all })).toBeNull();
  });

  it("draws each cover by the Home rule", async () => {
    const mosaic = { ...genrePlaylistFixture, id: "m", title: "Mosaic" };
    const two = {
      ...genrePlaylistFixture,
      id: "t",
      title: "Two",
      thumbnail_urls: ["test://img/a", "test://img/b"],
    };
    const curated = {
      ...genrePlaylistFixture,
      id: "u",
      title: "Curated",
      thumbnail_urls: [],
      thumbnail_url: "test://img/curated",
    };
    const bare = {
      ...genrePlaylistFixture,
      id: "b",
      title: "Bare",
      thumbnail_urls: [],
      thumbnail_url: null,
    };
    await setup({ listGenrePlaylists: playlistsOf([mosaic, two, curated, bare]) });
    await screen.findByText("Mosaic");
    expect(screen.getAllByTestId("cover-mosaic")).toHaveLength(1);
    const singles = screen.getAllByTestId("cover-single");
    expect(singles.map((node) => node.props.source as unknown)).toEqual([
      { uri: "test://img/a" },
      { uri: "test://img/curated" },
    ]);
    expect(screen.getAllByTestId("cover-placeholder")).toHaveLength(1);
    expect(within(screen.getByTestId("genre-playlists")).getByText("Bare")).toBeTruthy();
  });

  it("draws the track count with plural forms", async () => {
    const one = { ...genrePlaylistFixture, id: "o", title: "One", track_count: 1 };
    await setup({ listGenrePlaylists: playlistsOf([one, hits]) });
    expect(await screen.findByText("1 track")).toBeTruthy();
    expect(screen.getByText("12 tracks")).toBeTruthy();
  });

  it("draws no pressable cards", async () => {
    await setup({
      listGenrePlaylists: playlistsOf([hits]),
      listGenreCategories: categoriesOf(["Hits"]),
    });
    await screen.findByText("Hits one");
    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  it("draws the empty state with no retry when the genre has no playlists", async () => {
    await setup();
    expect(await screen.findByText(en.genre.empty)).toBeTruthy();
    expect(screen.queryByText(en.common.retry)).toBeNull();
  });

  it("draws the generic error when playlists fail and retry refetches only them", async () => {
    const ctx = await setup({ listGenrePlaylists: () => Promise.resolve(failure) });
    expect(await screen.findByText(en.common.error.generic)).toBeTruthy();
    await fireEvent.press(screen.getByText(en.common.retry));
    await waitFor(() => {
      expect(ctx.listGenrePlaylists).toHaveBeenCalledTimes(2);
    });
    expect(ctx.listGenreCategories).toHaveBeenCalledTimes(1);
  });

  it("draws the generic error, never the reason, for genre_not_found", async () => {
    await setup({ listGenreCategories: () => Promise.resolve(failure) });
    expect(await screen.findByText(en.common.error.generic)).toBeTruthy();
    expect(screen.queryByText("genre_not_found")).toBeNull();
  });

  it("goes back, or to explore when there is nothing to go back to", async () => {
    await setup();
    await fireEvent.press(screen.getByRole("button", { name: en.genre.back }));
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
    mockCanGoBack = false;
    await fireEvent.press(screen.getByRole("button", { name: en.genre.back }));
    expect(mockReplace).toHaveBeenCalledWith("/explore");
  });

  it("draws in es", async () => {
    await i18n.changeLanguage("es");
    await setup({
      listGenrePlaylists: playlistsOf([hits]),
      listGenreCategories: categoriesOf(["Hits"]),
    });
    expect(await screen.findByText("12 canciones")).toBeTruthy();
    expect(screen.getByRole("button", { name: resources.es.genre.all })).toBeTruthy();
  });
});

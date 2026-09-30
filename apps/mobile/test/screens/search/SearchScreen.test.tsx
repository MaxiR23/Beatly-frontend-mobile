// apps/mobile/test/screens/search/SearchScreen.test.tsx
//
// Tests for the search tab.
//
// Tested:
// - SearchScreen
//
// What is covered:
// - recent queries: newest first, recorded on submit and kept after a remount, removed one by one and all, run from a row
// - results in order (artist, songs, albums), no results, the generic error with retry, loading, the debounce, clear
// - the top artist image, and the placeholder when it has none
// - an album result opens the album, the top artist opens the artist
// - the account sheet, en and es
//
// Run with: pnpm --filter @beatly/mobile test -- SearchScreen
//
// SEE: apps/mobile/src/screens/search/SearchScreen.tsx

import { RECENT_SEARCHES_KEY } from "@beatly/core";
import type { HttpOutcome, SearchResult, StoragePort } from "@beatly/core";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { i18n } from "../../../src/adapters/i18n.ts";
import { resources } from "../../../src/i18n/resources.ts";
import { SearchScreen } from "../../../src/screens/search/SearchScreen.tsx";
import { makeCore, memoryStorage, searchResultFixture, Wrapper } from "../../helpers/core.tsx";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));

afterEach(async () => {
  mockPush.mockClear();
  await i18n.changeLanguage("en");
});

const en = resources.en;

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function tree(ctx: ReturnType<typeof makeCore>) {
  return (
    <Wrapper core={ctx.core}>
      <SafeAreaProvider initialMetrics={metrics}>
        <SearchScreen />
      </SafeAreaProvider>
    </Wrapper>
  );
}

async function setup(options: Parameters<typeof makeCore>[0] = {}) {
  const ctx = makeCore(options);
  const view = await render(tree(ctx));
  return { ...ctx, view };
}

const seed = (queries: string[]) =>
  memoryStorage({ [RECENT_SEARCHES_KEY]: JSON.stringify(queries) });

const seedRaw = (raw: string) => memoryStorage({ [RECENT_SEARCHES_KEY]: raw });

const emptyResult: HttpOutcome<SearchResult> = {
  kind: "success",
  data: { artist: null, songs: [], albums: [] },
  maxAgeSeconds: 0,
};

const input = () => screen.getByLabelText(en.search.title);

describe("SearchScreen recents", () => {
  it("draws the stored recent queries newest first", async () => {
    await setup({ storage: seed(["b", "a"]) });
    await screen.findByText(en.search.recent.title);
    const labels = screen
      .getAllByRole("button")
      .map((b) => b.props.accessibilityLabel as string)
      .filter((l) => l === "a" || l === "b");
    expect(labels).toEqual(["b", "a"]);
  });

  it("draws the empty state when nothing was searched", async () => {
    await setup();
    expect(await screen.findByText(en.search.recent.empty)).toBeTruthy();
  });

  it("records a submitted query and keeps it after the screen remounts", async () => {
    const storage = memoryStorage();
    const first = await setup({ storage });
    await screen.findByText(en.search.recent.empty);
    await fireEvent.changeText(input(), "daft");
    await fireEvent(input(), "submitEditing");
    await waitFor(async () => {
      expect(await storage.get(RECENT_SEARCHES_KEY)).toBe(JSON.stringify(["daft"]));
    });
    await first.view.unmount();
    await setup({ storage });
    expect(await screen.findByRole("button", { name: "daft" })).toBeTruthy();
  });

  it("removes one recent query", async () => {
    const storage = seed(["b", "a"]);
    await setup({ storage });
    await fireEvent.press(await screen.findByRole("button", { name: "Remove a" }));
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "a" })).toBeNull();
    });
    expect(screen.getByRole("button", { name: "b" })).toBeTruthy();
    expect(await storage.get(RECENT_SEARCHES_KEY)).toBe(JSON.stringify(["b"]));
  });

  it("clears all recent queries", async () => {
    await setup({ storage: seed(["b", "a"]) });
    await fireEvent.press(await screen.findByText(en.search.recent.clearAll));
    expect(await screen.findByText(en.search.recent.empty)).toBeTruthy();
  });

  it("runs a recent query when its row is pressed", async () => {
    const ctx = await setup({ storage: seed(["b", "a"]) });
    await fireEvent.press(await screen.findByRole("button", { name: "b" }));
    await waitFor(() => {
      expect(ctx.search).toHaveBeenCalledWith("b");
    });
    expect(input().props.value).toBe("b");
  });

  it("draws the generic error with retry when the recent queries cannot be read", async () => {
    const storage: StoragePort = {
      ...memoryStorage(),
      get: () => Promise.reject(new Error("down")),
    };
    await setup({ storage });
    expect(await screen.findByText(en.common.error.generic)).toBeTruthy();
    expect(screen.getByText(en.common.retry)).toBeTruthy();
  });

  it("recovers from a corrupted stored value with Clear all", async () => {
    await setup({ storage: seedRaw("not json") });
    await fireEvent.press(await screen.findByText(en.search.recent.clearAll));
    expect(await screen.findByText(en.search.recent.empty)).toBeTruthy();
  });
});

describe("SearchScreen results", () => {
  it("starts the songs from the pressed one with the search source", async () => {
    const ctx = await setup();
    await fireEvent.changeText(input(), "test");
    await screen.findByText("Test Song");
    await fireEvent.press(screen.getByRole("button", { name: "Test Song" }));
    const state = ctx.playback.getState();
    expect(state.current?.trackId).toBe("t1");
    expect(state.source).toEqual({ kind: "search", id: "test", name: "test" });
  });

  it("draws the top artist, then songs, then albums", async () => {
    await setup();
    await fireEvent.changeText(input(), "test");
    await screen.findByText("Test Song");
    const texts = screen
      .getAllByText(/.+/)
      .map((n) => n.props.children as unknown)
      .flat()
      .filter((c): c is string => typeof c === "string");
    const at = (s: string) => texts.indexOf(s);
    expect(at("Test Artist")).toBeGreaterThanOrEqual(0);
    expect(at("Test Artist")).toBeLessThan(at(en.search.songs));
    expect(at(en.search.songs)).toBeLessThan(at("Test Song"));
    expect(at("Test Song")).toBeLessThan(at(en.search.albums));
    expect(at(en.search.albums)).toBeLessThan(at("Test Album"));
    expect(screen.getByText("Test Artist · 3:45")).toBeTruthy();
    expect(screen.getByText(en.search.artist)).toBeTruthy();
  });

  it("draws the top artist's image", async () => {
    await setup();
    await fireEvent.changeText(input(), "test");
    await screen.findByText("Test Song");
    const cover = within(screen.getByTestId("search-artist")).getByTestId("cover-single");
    expect(cover.props.source as unknown).toEqual({ uri: "test://img/ar1" });
  });

  it("opens the top artist", async () => {
    await setup();
    await fireEvent.changeText(input(), "test");
    await fireEvent.press(await screen.findByRole("button", { name: "Test Artist" }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: "/artist/[id]", params: { id: "ar1" } });
  });

  it("draws the placeholder when the top artist has no image", async () => {
    const artist = { id: "ar1", name: "Test Artist", thumbnail_url: null };
    await setup({
      search: () =>
        Promise.resolve({
          kind: "success",
          data: { ...searchResultFixture, artist },
          maxAgeSeconds: 0,
        }),
    });
    await fireEvent.changeText(input(), "test");
    await screen.findByText("Test Song");
    const row = within(screen.getByTestId("search-artist"));
    expect(row.getByTestId("cover-placeholder")).toBeTruthy();
    expect(row.queryByTestId("cover-single")).toBeNull();
  });

  it("draws no results with the query and no retry", async () => {
    await setup({ search: () => Promise.resolve(emptyResult) });
    await fireEvent.changeText(input(), "zzz");
    expect(await screen.findByText("No results for “zzz”")).toBeTruthy();
    expect(screen.queryByText(en.common.retry)).toBeNull();
  });

  it("draws the generic error and retries", async () => {
    const ctx = await setup({
      search: () => Promise.resolve({ kind: "api_failure", reason: "upstream_error" }),
    });
    await fireEvent.changeText(input(), "zzz");
    expect(await screen.findByText(en.common.error.generic)).toBeTruthy();
    await fireEvent.press(screen.getByText(en.common.retry));
    await waitFor(() => {
      expect(ctx.search).toHaveBeenCalledTimes(2);
    });
  });

  it("draws the loading state while the search is pending", async () => {
    await setup({ search: () => new Promise(() => undefined) });
    await fireEvent.changeText(input(), "zzz");
    expect(await screen.findByLabelText(en.common.loading)).toBeTruthy();
  });

  it("sends only the last query typed within the debounce", async () => {
    const ctx = await setup();
    await fireEvent.changeText(input(), "da");
    await fireEvent.changeText(input(), "daft");
    await waitFor(() => {
      expect(ctx.search).toHaveBeenCalledTimes(1);
    });
    expect(ctx.search).toHaveBeenCalledWith("daft");
  });

  it("clears the text and shows the recent queries again", async () => {
    await setup({ storage: seed(["b"]) });
    await screen.findByText(en.search.recent.title);
    await fireEvent.changeText(input(), "test");
    await screen.findByText("Test Song");
    await fireEvent.press(screen.getByRole("button", { name: en.search.clear }));
    expect(await screen.findByText(en.search.recent.title)).toBeTruthy();
    expect(input().props.value).toBe("");
  });
});

describe("SearchScreen frame", () => {
  it("draws the title and opens the account sheet from the avatar", async () => {
    const ctx = await setup();
    await screen.findByText(en.search.recent.empty);
    expect(screen.getByText(en.search.title)).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: en.common.account.open }));
    await fireEvent.press(await screen.findByRole("button", { name: en.common.account.logout }));
    await waitFor(() => {
      expect(ctx.auth.signOut).toHaveBeenCalledTimes(1);
    });
  });

  it("draws in es", async () => {
    await i18n.changeLanguage("es");
    await setup();
    expect(await screen.findByText(resources.es.search.recent.empty)).toBeTruthy();
    expect(screen.getByText(resources.es.search.title)).toBeTruthy();
  });

  it("opens an album result", async () => {
    await setup();
    await fireEvent.changeText(input(), "test");
    await fireEvent.press(await screen.findByRole("button", { name: "Test Album" }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: "/album/[id]", params: { id: "al1" } });
  });
});

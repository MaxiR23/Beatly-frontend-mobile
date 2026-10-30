// apps/mobile/test/screens/artist/ArtistScreen.test.tsx
//
// Tests for the artist screen.
//
// Tested:
// - ArtistScreen
//
// What is covered:
// - the skeleton, the request for the route's artist, the name over the full-width image hero
// - the four sections with their titles, a song without track_id dimmed, a more button and no pressable song
// - the popular songs as rows of the detail base under their title, spacing.md apart; the carousels in the slot after the rows, in order, spacing.xl after the last song and none without songs
// - the year under an album, the kind and year under a single, each empty section hidden, only the hero when all are empty
// - a song without track_id announced as not available; next, previous and shuffle never reach it
// - starting the popular songs registers the artist as a recent
// - the playing popular song's row marked with the now playing bars, never an unavailable song
// - opening an album from the albums and singles carousels and a similar artist
// - not available for invalid_request without retry, the generic error with retry for upstream_error and upstream_timeout and a transport failure
// - the favorite star: the saved state asked for the route's artist, outline and filled with its add and remove label, disabled while its state loads or fails
// - saving or removing flips the star at once with the added or removed notice, rolls back with the generic error notice on failure, library_item_not_found is a removal, the notice clears after motion.duration.notice
// - back and its fallback, es
//
// Run with: pnpm --filter @beatly/mobile test -- ArtistScreen
//
// SEE: apps/mobile/src/screens/artist/ArtistScreen.tsx

import type { Artist, HttpOutcome, LibrarySavedState } from "@beatly/core";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react-native";
import { type ViewStyle } from "react-native";

import { color, motion, spacing } from "@beatly/ui";
import { i18n } from "../../../src/adapters/i18n.ts";
import { resources } from "../../../src/i18n/resources.ts";
import { ArtistScreen } from "../../../src/screens/artist/ArtistScreen.tsx";
import { artistFixture, makeCore, stateFlag, Wrapper } from "../../helpers/core.tsx";
import { Insets } from "../../helpers/insets.tsx";
import { flatStyle } from "../../helpers/flatStyle.ts";

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
  useLocalSearchParams: () => ({ id: "UCar1" }),
}));

afterEach(async () => {
  mockPush.mockClear();
  mockBack.mockClear();
  mockReplace.mockClear();
  mockCanGoBack = true;
  await i18n.changeLanguage("en");
});

const en = resources.en;
const es = resources.es;

async function setup(options: Parameters<typeof makeCore>[0] = {}) {
  const ctx = makeCore(options);
  await render(
    <Wrapper core={ctx.core}>
      <Insets>
        <ArtistScreen />
      </Insets>
    </Wrapper>,
  );
  return ctx;
}

function artistOf(artist: Artist) {
  return () =>
    Promise.resolve<HttpOutcome<Artist>>({ kind: "success", data: artist, maxAgeSeconds: 0 });
}

const sectionIds = ["artist-popular", "artist-albums", "artist-singles", "artist-similar"] as const;
const emptied: Record<(typeof sectionIds)[number], Partial<Artist>> = {
  "artist-popular": { songs: [] },
  "artist-albums": { albums: [] },
  "artist-singles": { singles: [] },
  "artist-similar": { related: [] },
};

describe("ArtistScreen", () => {
  it("draws the skeleton while the artist loads", async () => {
    await setup({ getArtist: () => new Promise(() => undefined) });
    expect(screen.getByTestId("detail-skeleton")).toBeTruthy();
    expect(screen.getByTestId("detail-skeleton-image")).toBeTruthy();
    expect(screen.getByLabelText(en.common.loading)).toBeTruthy();
  });

  it("asks for the artist of the route", async () => {
    const ctx = await setup();
    await screen.findByTestId("artist");
    expect(ctx.getArtist).toHaveBeenCalledWith("UCar1");
  });

  it("draws the name over the full-width image hero, the photo at the large tier", async () => {
    await setup();
    const hero = await screen.findByTestId("detail-hero-image");
    expect(within(hero).getByText("Test Artist")).toBeTruthy();
    expect(screen.getByTestId("detail-hero-photo").props.source).toEqual([
      { uri: "test://img/ar1/l" },
    ]);
  });

  it("draws the four sections with their titles", async () => {
    await setup();
    for (const id of sectionIds) expect(await screen.findByTestId(id)).toBeTruthy();
    for (const title of [
      en.artist.popular,
      en.artist.albums,
      en.artist.singles,
      en.artist.similar,
    ]) {
      expect(screen.getByText(title)).toBeTruthy();
    }
  });

  it("draws a popular song with its album and dims one without track_id", async () => {
    await setup();
    const popular = await screen.findByText("Popular Song");
    expect(screen.getByText("Test Album")).toBeTruthy();
    // An available row carries no accessibility state at all.
    expect(stateFlag(popular.parent?.parent ?? popular, "disabled")).not.toBe(true);
    const hidden = screen.getByText("Hidden Song");
    expect(stateFlag(hidden.parent?.parent ?? hidden, "disabled")).toBe(true);
    expect(hidden).toHaveStyle({ color: color.text.disabled });
    expect(
      screen.getByLabelText(en.artist.trackUnavailable.replace("{{title}}", "Hidden Song")),
    ).toBeTruthy();
  });

  it("never reaches a song without a track id with next, previous or shuffle", async () => {
    const [first, hidden] = artistFixture.songs;
    if (first === undefined || hidden === undefined) throw new Error("fixture songs");
    const ctx = await setup({
      getArtist: () =>
        Promise.resolve<HttpOutcome<Artist>>({
          kind: "success",
          data: {
            ...artistFixture,
            songs: [first, hidden, { ...first, track_id: "t2", title: "Second Song" }],
          },
          maxAgeSeconds: 0,
        }),
    });
    await fireEvent.press(await screen.findByRole("button", { name: "Popular Song" }));
    expect(ctx.playback.getState().queue.map((t) => t.trackId)).toEqual(["t1", "t2"]);
    await act(async () => {
      await ctx.playback.next();
    });
    expect(ctx.playback.getState().current?.trackId).toBe("t2");
    await act(async () => {
      await ctx.playback.previous();
    });
    expect(ctx.playback.getState().current?.trackId).toBe("t1");
    await act(() => {
      ctx.playback.setShuffle(true);
    });
    expect(new Set(ctx.playback.getState().queue.map((t) => t.trackId))).toEqual(
      new Set(["t1", "t2"]),
    );
  });

  it("draws a more button and a pressable song only when it has a track id", async () => {
    await setup();
    await screen.findByTestId("artist-popular");
    const names = screen.getAllByRole("button").map((b) => b.props.accessibilityLabel as unknown);
    expect(new Set(names)).toEqual(
      new Set([
        en.artist.back,
        en.artist.favorite.add,
        "Popular Song",
        "First Album",
        "A Single",
        "An EP",
        "Similar Artist",
        en.trackMenu.more,
      ]),
    );
    expect(names.filter((name) => name === en.trackMenu.more)).toHaveLength(1);
  });

  it("starts the popular songs from the pressed one with the artist source", async () => {
    const ctx = await setup();
    await screen.findByTestId("artist-popular");
    await fireEvent.press(screen.getByRole("button", { name: "Popular Song" }));
    const state = ctx.playback.getState();
    expect(state.current?.trackId).toBe("t1");
    expect(state.queue.map((t) => t.trackId)).toEqual(["t1"]);
    expect(state.source).toEqual({ kind: "artist", id: "UCar1", name: "Test Artist" });
    expect(screen.queryByRole("button", { name: "Hidden Song" })).toBeNull();
  });

  it("marks the playing song", async () => {
    const ctx = await setup();
    await screen.findByTestId("artist-popular");
    expect(screen.queryByTestId("now-playing-bars")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Popular Song" }));
    await act(() => {
      ctx.player.emit({
        type: "progress",
        playing: true,
        buffering: false,
        positionSeconds: 1,
        durationSeconds: 100,
      });
    });
    expect(
      within(screen.getByRole("button", { name: "Popular Song" })).getByTestId("now-playing-bars"),
    ).toBeTruthy();
    expect(screen.getAllByTestId("now-playing-bars")).toHaveLength(1);
  });

  it("registers the artist as a recent with its image and no subtitle", async () => {
    const ctx = await setup();
    await screen.findByTestId("artist-popular");
    await fireEvent.press(screen.getByRole("button", { name: "Popular Song" }));
    expect(ctx.registerRecent).toHaveBeenCalledWith({
      entity_type: "artist",
      entity_id: "UCar1",
      metadata: { title: "Test Artist", subtitle: null, thumbnail_url: "test://img/ar1" },
    });
  });

  it("draws the year under an album and the kind with the year under a single", async () => {
    await setup();
    expect(await screen.findByText("2013")).toBeTruthy();
    expect(screen.getByText("Single · 2024")).toBeTruthy();
    expect(screen.getByText("EP · 2023")).toBeTruthy();
  });

  it.each(sectionIds)("hides an empty section: %s", async (hiddenId) => {
    await setup({ getArtist: artistOf({ ...artistFixture, ...emptied[hiddenId] }) });
    await screen.findByTestId("artist-sections");
    expect(screen.queryByTestId(hiddenId)).toBeNull();
    for (const id of sectionIds.filter((s) => s !== hiddenId)) {
      expect(screen.getByTestId(id)).toBeTruthy();
    }
    if (hiddenId === "artist-popular") {
      expect(screen.queryAllByTestId(/^detail-cascade-row-/)).toHaveLength(0);
      const style = flatStyle(screen.getByTestId("artist-sections").props.style as ViewStyle);
      expect(style.paddingTop).toBeUndefined();
    }
  });

  it("draws the popular songs as rows of the detail base", async () => {
    await setup();
    await screen.findByText("Popular Song");
    expect(
      within(screen.getByTestId("detail-cascade-row-0:t1")).getByText("Popular Song"),
    ).toBeTruthy();
    expect(
      within(screen.getByTestId("detail-cascade-row-1:Hidden Song")).getByText("Hidden Song"),
    ).toBeTruthy();
    const popular = screen.getByTestId("artist-popular");
    expect(within(popular).queryByText("Popular Song")).toBeNull();
    expect(within(popular).getByText(en.artist.popular)).toBeTruthy();
    for (const song of screen.getAllByTestId("artist-song")) {
      expect(flatStyle(song.props.style as ViewStyle)).toEqual({
        paddingTop: spacing.md,
      });
    }
  });

  it("draws the carousels after the songs, in the slot after the rows", async () => {
    await setup();
    const slot = await screen.findByTestId("detail-cascade-after-rows");
    const sections = within(slot).getByTestId("artist-sections");
    expect(
      within(sections)
        .queryAllByTestId(/^artist-(albums|singles|similar)$/)
        .map((node) => node.props.testID as string),
    ).toEqual(["artist-albums", "artist-singles", "artist-similar"]);
    expect(flatStyle(sections.props.style as ViewStyle)).toEqual({
      gap: spacing.xl,
      paddingTop: spacing.xl,
    });
  });

  it("draws only the hero when every section is empty", async () => {
    await setup({
      getArtist: artistOf({ ...artistFixture, songs: [], albums: [], singles: [], related: [] }),
    });
    expect(await screen.findByText("Test Artist")).toBeTruthy();
    for (const id of sectionIds) expect(screen.queryByTestId(id)).toBeNull();
    expect(screen.queryByTestId("detail-cascade-after-rows")).toBeNull();
    expect(screen.queryAllByTestId(/^detail-cascade-row-/)).toHaveLength(0);
    expect(screen.queryByText(en.common.retry)).toBeNull();
  });

  it("opens an album from the albums and the singles carousels", async () => {
    await setup();
    await fireEvent.press(await screen.findByRole("button", { name: "First Album" }));
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: "/album/[id]",
      params: { id: "MPREb_1" },
    });
    await fireEvent.press(screen.getByRole("button", { name: "A Single" }));
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: "/album/[id]",
      params: { id: "MPREb_4" },
    });
  });

  it("opens a similar artist", async () => {
    await setup();
    await fireEvent.press(await screen.findByRole("button", { name: "Similar Artist" }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/artist/[id]",
      params: { id: "UCar2" },
    });
  });

  it("draws not available for invalid_request, without retry", async () => {
    await setup({
      getArtist: () => Promise.resolve({ kind: "api_failure", reason: "invalid_request" }),
    });
    expect(await screen.findByText(en.artist.notAvailable)).toBeTruthy();
    expect(screen.queryByText(en.common.retry)).toBeNull();
  });

  it.each(["upstream_error", "upstream_timeout"] as const)(
    "draws the generic error with retry for %s and refetches",
    async (reason) => {
      const ctx = await setup({
        getArtist: () => Promise.resolve({ kind: "api_failure", reason }),
      });
      expect(await screen.findByText(en.common.error.generic)).toBeTruthy();
      expect(screen.queryByText(en.artist.notAvailable)).toBeNull();
      const before = ctx.getArtist.mock.calls.length;
      await fireEvent.press(screen.getByRole("button", { name: en.common.retry }));
      await screen.findByText(en.common.error.generic);
      expect(ctx.getArtist.mock.calls.length).toBeGreaterThan(before);
    },
  );

  it("draws the generic error for a transport failure", async () => {
    await setup({
      getArtist: () => Promise.resolve({ kind: "transport_failure", cause: "network" }),
    });
    expect(await screen.findByText(en.common.error.generic)).toBeTruthy();
    expect(screen.getByRole("button", { name: en.common.retry })).toBeTruthy();
  });

  it("goes back, or replaces with / when there is nothing to go back to", async () => {
    await setup();
    await screen.findByTestId("artist-popular");
    await fireEvent.press(screen.getByRole("button", { name: en.artist.back }));
    expect(mockBack).toHaveBeenCalledTimes(1);
    mockCanGoBack = false;
    await fireEvent.press(screen.getByRole("button", { name: en.artist.back }));
    expect(mockReplace).toHaveBeenCalledWith("/");
  });

  it("draws in es", async () => {
    await i18n.changeLanguage("es");
    await setup();
    expect(await screen.findByText(es.artist.popular)).toBeTruthy();
    expect(screen.getByText("Sencillo · 2024")).toBeTruthy();
  });
});

describe("ArtistScreen favorite star", () => {
  const savedOf = (saved: boolean) => (): Promise<HttpOutcome<LibrarySavedState>> =>
    Promise.resolve({ kind: "success", data: { saved }, maxAgeSeconds: 0 });
  // The refetch after a write never answers, so the optimistic value is what the star shows.
  const onceThenPending = (saved: boolean) =>
    jest
      .fn<() => ReturnType<ReturnType<typeof savedOf>>>()
      .mockImplementationOnce(savedOf(saved))
      .mockImplementation(() => new Promise(() => undefined));
  const add = () => screen.findByRole("button", { name: en.artist.favorite.add });
  const remove = () => screen.findByRole("button", { name: en.artist.favorite.remove });
  const noticeText = (text: string) => within(screen.getByTestId("artist-notice")).getByText(text);

  it("asks for the saved state of the route's artist", async () => {
    const ctx = await setup();
    await add();
    expect(ctx.getSavedState).toHaveBeenCalledWith("artist", "UCar1");
  });

  it("draws the star not selected with the add label when the artist is not saved", async () => {
    await setup({ getSavedState: savedOf(false) });
    const star = await add();
    expect(stateFlag(star, "selected")).toBe(false);
    expect(stateFlag(star, "disabled")).toBeFalsy();
    expect(screen.queryByTestId("artist-notice")).toBeNull();
  });

  it("draws the star selected with the remove label when the artist is saved", async () => {
    await setup({ getSavedState: savedOf(true) });
    expect(stateFlag(await remove(), "selected")).toBe(true);
  });

  it("saves the artist with its body, flips the star at once and shows the added notice", async () => {
    const ctx = await setup({
      getSavedState: jest
        .fn<() => ReturnType<ReturnType<typeof savedOf>>>()
        .mockImplementationOnce(savedOf(false))
        .mockImplementation(() => new Promise(() => undefined)),
      saveItem: () => new Promise(() => undefined),
    });
    await fireEvent.press(await add());
    expect(await remove()).toBeTruthy();
    expect(noticeText(en.artist.favorite.added)).toBeTruthy();
    expect(ctx.saveItem).toHaveBeenCalledWith({
      kind: "artist",
      source: "external",
      external_id: "UCar1",
      title: "Test Artist",
      thumbnail_url: "test://img/ar1",
    });
  });

  it("removes a saved artist and shows the removed notice", async () => {
    const ctx = await setup({ getSavedState: onceThenPending(true) });
    await fireEvent.press(await remove());
    expect(await add()).toBeTruthy();
    expect(noticeText(en.artist.favorite.removed)).toBeTruthy();
    expect(ctx.removeItem).toHaveBeenCalledWith("artist", "UCar1");
  });

  it("rolls the star back and shows the generic error notice when the save fails", async () => {
    // The refetch after the failure waits for the test, so the star returns by the rollback alone.
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await setup({
      getSavedState: jest
        .fn<() => ReturnType<ReturnType<typeof savedOf>>>()
        .mockImplementationOnce(savedOf(false))
        .mockImplementation(async () => {
          await held;
          return savedOf(false)();
        }),
      saveItem: () => Promise.resolve({ kind: "api_failure", reason: "upstream_error" }),
    });
    await fireEvent.press(await add());
    expect(await add()).toBeTruthy();
    release();
    await waitFor(() => {
      expect(noticeText(en.common.error.generic)).toBeTruthy();
    });
    expect(await add()).toBeTruthy();
    expect(screen.queryByText(en.artist.favorite.added)).toBeNull();
  });

  it("keeps the star off and shows the removed notice on library_item_not_found", async () => {
    await setup({
      getSavedState: jest
        .fn<() => ReturnType<ReturnType<typeof savedOf>>>()
        .mockImplementationOnce(savedOf(true))
        .mockImplementation(savedOf(false)),
      removeItem: () => Promise.resolve({ kind: "api_failure", reason: "library_item_not_found" }),
    });
    await fireEvent.press(await remove());
    expect(await add()).toBeTruthy();
    expect(noticeText(en.artist.favorite.removed)).toBeTruthy();
    expect(screen.queryByText(en.common.error.generic)).toBeNull();
  });

  it.each<[string, () => Promise<HttpOutcome<LibrarySavedState>>]>([
    ["loads", () => new Promise(() => undefined)],
    ["fails", () => Promise.resolve({ kind: "transport_failure", cause: "network" })],
  ])("disables the star while its state %s, drawing the rest", async (_name, getSavedState) => {
    await setup({ getSavedState });
    const star = await add();
    expect(stateFlag(star, "disabled")).toBe(true);
    expect(await screen.findByText("Popular Song")).toBeTruthy();
  });

  it("clears the notice after motion.duration.notice", async () => {
    jest.useFakeTimers({ advanceTimers: true });
    try {
      await setup({ getSavedState: savedOf(false) });
      await fireEvent.press(await add());
      expect(screen.getByTestId("artist-notice")).toBeTruthy();
      await act(async () => {
        await jest.advanceTimersByTimeAsync(motion.duration.notice + 1);
      });
      expect(screen.queryByTestId("artist-notice")).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it("draws the star label and the notice in es", async () => {
    await i18n.changeLanguage("es");
    await setup({ getSavedState: onceThenPending(false) });
    await fireEvent.press(await screen.findByRole("button", { name: es.artist.favorite.add }));
    expect(noticeText(es.artist.favorite.added)).toBeTruthy();
    expect(await screen.findByRole("button", { name: es.artist.favorite.remove })).toBeTruthy();
  });
});

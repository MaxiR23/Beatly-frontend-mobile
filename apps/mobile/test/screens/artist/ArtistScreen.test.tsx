// apps/mobile/test/screens/artist/ArtistScreen.test.tsx
//
// Tests for the artist screen.
//
// Tested:
// - ArtistScreen
//
// What is covered:
// - the skeleton, the request for the route's artist, the name over the full-width image hero
// - the four sections with their titles, a song without track_id dimmed, no action button and no pressable song
// - the year under an album, the kind and year under a single, each empty section hidden, only the hero when all are empty
// - opening an album from the albums and singles carousels and a similar artist
// - not available for invalid_request without retry, the generic error with retry for upstream_error and upstream_timeout and a transport failure
// - back and its fallback, es
//
// Run with: pnpm --filter @beatly/mobile test -- ArtistScreen
//
// SEE: apps/mobile/src/screens/artist/ArtistScreen.tsx

import type { Artist, HttpOutcome } from "@beatly/core";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, within } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { i18n } from "../../../src/adapters/i18n.ts";
import { resources } from "../../../src/i18n/resources.ts";
import { ArtistScreen } from "../../../src/screens/artist/ArtistScreen.tsx";
import { artistFixture, makeCore, stateFlag, Wrapper } from "../../helpers/core.tsx";

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

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

async function setup(options: Parameters<typeof makeCore>[0] = {}) {
  const ctx = makeCore(options);
  await render(
    <Wrapper core={ctx.core}>
      <SafeAreaProvider initialMetrics={metrics}>
        <ArtistScreen />
      </SafeAreaProvider>
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

  it("draws the name over the full-width image hero", async () => {
    await setup();
    const hero = await screen.findByTestId("detail-hero-image");
    expect(within(hero).getByText("Test Artist")).toBeTruthy();
    expect(screen.getByTestId("detail-hero-photo").props.source).toEqual({
      uri: "test://img/ar1",
    });
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
  });

  it("draws no action buttons and no pressable song", async () => {
    await setup();
    await screen.findByTestId("artist-popular");
    const names = screen.getAllByRole("button").map((b) => b.props.accessibilityLabel as unknown);
    expect(new Set(names)).toEqual(
      new Set([en.artist.back, "First Album", "A Single", "An EP", "Similar Artist"]),
    );
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
  });

  it("draws only the hero when every section is empty", async () => {
    await setup({
      getArtist: artistOf({ ...artistFixture, songs: [], albums: [], singles: [], related: [] }),
    });
    expect(await screen.findByText("Test Artist")).toBeTruthy();
    for (const id of sectionIds) expect(screen.queryByTestId(id)).toBeNull();
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

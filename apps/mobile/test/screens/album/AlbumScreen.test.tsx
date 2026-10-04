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
// - the generic error with retry for upstream_error and a transport failure, back and its fallback, es
//
// Run with: pnpm --filter @beatly/mobile test -- AlbumScreen
//
// SEE: apps/mobile/src/screens/album/AlbumScreen.tsx

import type { Album, HttpOutcome } from "@beatly/core";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { StyleSheet, type ViewStyle } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { color, spacing } from "@beatly/ui";
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

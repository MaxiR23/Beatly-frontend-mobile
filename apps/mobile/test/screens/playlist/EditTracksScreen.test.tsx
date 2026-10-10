// apps/mobile/test/screens/playlist/EditTracksScreen.test.tsx
//
// Tests for the edit mode of an own playlist's tracks.
//
// Tested:
// - EditTracksScreen
//
// What is covered:
// - loading until every page has loaded, the error with retry when a later page fails, not found, the empty message
// - the list in the server's order with its position labels
// - Android and the iOS fallback: a move redrawn at once and sent with 1-based positions, two moves sent in order, a remove hidden and sent, a failed move or remove showing the notice and redrawing the server order
// - iOS with the native list: it is taken when available, a native move and a native delete are sent
// - Done waiting for the pending request before going back, leaving refreshing the playlist, the library and the playlists, and the playback queue left alone
// - es
//
// Run with: pnpm --filter @beatly/mobile test -- EditTracksScreen
//
// SEE: apps/mobile/src/screens/playlist/EditTracksScreen.tsx

import type { HttpOutcome, PageResult, PlaylistTrack } from "@beatly/core";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { i18n } from "../../../src/adapters/i18n.ts";
import { resources } from "../../../src/i18n/resources.ts";
import { EditTracksScreen } from "../../../src/screens/playlist/EditTracksScreen.tsx";
import { createTestQueryClient } from "../../helpers/queryClient.ts";
import { makeCore, pageOf, playlistTrackFixture, stateFlag, Wrapper } from "../../helpers/core.tsx";

const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockNativeAvailable = false;
const mockNative: { props: Record<string, unknown> } = { props: {} };
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace, canGoBack: () => true }),
  useLocalSearchParams: () => ({ id: "p1" }),
}));
jest.mock("@beatly/ui/native", () => {
  const actual = jest.requireActual<Record<string, unknown>>("@beatly/ui/native");
  const { View } = jest.requireActual<{ View: React.ComponentType<Record<string, unknown>> }>(
    "react-native",
  );
  return {
    ...actual,
    isNativeEditListAvailable: () => mockNativeAvailable,
    NativeEditList: (props: Record<string, unknown>) => {
      mockNative.props = props;
      return <View testID="native-edit-list" />;
    },
  };
});

afterEach(async () => {
  jest.restoreAllMocks();
  mockBack.mockClear();
  mockReplace.mockClear();
  mockNativeAvailable = false;
  await i18n.changeLanguage("en");
});

const en = resources.en;
const es = resources.es;

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const first = playlistTrackFixture;
const second: PlaylistTrack = { ...first, track_id: "t2", title: "Second Song", position: 2 };
const third: PlaylistTrack = { ...first, track_id: "t3", title: "Third Song", position: 3 };
const three = [first, second, third];

async function setup(options: Parameters<typeof makeCore>[0] = {}) {
  const ctx = makeCore({ listPlaylistTracks: () => Promise.resolve(pageOf(three)), ...options });
  const client = createTestQueryClient();
  const invalidate = jest.spyOn(client, "invalidateQueries");
  const view = await render(
    <Wrapper core={ctx.core} client={client}>
      <SafeAreaProvider initialMetrics={metrics}>
        <EditTracksScreen />
      </SafeAreaProvider>
    </Wrapper>,
  );
  return { ctx, invalidate, view };
}

const titles = () => screen.getAllByText(/ Song$/).map((node) => node.props.children as string);
const rowLabel = (title: string) => screen.getByLabelText(new RegExp(`^${title},`));
const act1 = (title: string, actionName: "moveUp" | "moveDown") =>
  fireEvent(rowLabel(title), "accessibilityAction", { nativeEvent: { actionName } });
const failure: HttpOutcome<never> = { kind: "api_failure", reason: "order_key_conflict" };
const done = () => screen.getByRole("button", { name: en.playlist.editTracks.done });

describe("EditTracksScreen loading", () => {
  it("shows the loading state until every page has loaded", async () => {
    type Page = HttpOutcome<PageResult<PlaylistTrack>>;
    let release: (outcome: Page) => void = () => undefined;
    const held = new Promise<Page>((resolve) => {
      release = resolve;
    });
    const listPlaylistTracks = jest.fn((_id: string, cursor: string | null): Promise<Page> =>
      cursor === null
        ? Promise.resolve(pageOf([first, second], { has_more: true, next_cursor: "c1" }))
        : held,
    );
    await setup({ listPlaylistTracks });
    await waitFor(() => {
      expect(listPlaylistTracks).toHaveBeenCalledWith("p1", "c1");
    });
    expect(screen.getByLabelText(en.common.loading)).toBeTruthy();
    expect(screen.queryByText("First Song")).toBeNull();
    await act(async () => {
      release(pageOf([third]));
      await held;
    });
    expect(await screen.findByText("Third Song")).toBeTruthy();
    expect(titles()).toEqual(["First Song", "Second Song", "Third Song"]);
  });

  it("shows the error with retry when a later page fails, and retry loads the list", async () => {
    let healthy = false;
    const listPlaylistTracks = jest.fn((_id: string, cursor: string | null) => {
      if (cursor === null)
        return Promise.resolve(pageOf([first, second], { has_more: true, next_cursor: "c1" }));
      return Promise.resolve(healthy ? pageOf([third]) : failure);
    });
    await setup({ listPlaylistTracks });
    const retry = await screen.findByRole("button", { name: en.common.retry });
    expect(screen.getByText(en.common.error.generic)).toBeTruthy();
    healthy = true;
    await fireEvent.press(retry);
    expect(await screen.findByText("Third Song")).toBeTruthy();
    expect(titles()).toEqual(["First Song", "Second Song", "Third Song"]);
  });

  it("shows not found for playlist_not_found", async () => {
    await setup({
      listPlaylistTracks: () =>
        Promise.resolve({ kind: "api_failure", reason: "playlist_not_found" }),
    });
    expect(await screen.findByText(en.playlist.notFound)).toBeTruthy();
  });

  it("shows the empty message for a playlist with no tracks", async () => {
    await setup({ listPlaylistTracks: () => Promise.resolve(pageOf<PlaylistTrack>([])) });
    expect(await screen.findByText(en.playlist.empty)).toBeTruthy();
  });

  it("lists every track in the server's order with its position label", async () => {
    await setup();
    await screen.findByText("First Song");
    expect(titles()).toEqual(["First Song", "Second Song", "Third Song"]);
    expect(rowLabel("Second Song").props.accessibilityValue).toEqual({ text: "2 of 3" });
  });
});

describe("EditTracksScreen on the dragging list", () => {
  it("moving a row down redraws the list at once and sends one move-track with 1-based positions", async () => {
    const { ctx } = await setup();
    await screen.findByText("First Song");
    await act1("First Song", "moveDown");
    expect(titles()).toEqual(["Second Song", "First Song", "Third Song"]);
    await waitFor(() => {
      expect(ctx.moveTrack).toHaveBeenCalledTimes(1);
    });
    expect(ctx.moveTrack).toHaveBeenCalledWith("p1", 1, 2);
  });

  it("moving the last row up twice sends two move-tracks in order, the second after the first", async () => {
    let release: () => void = () => undefined;
    const held = new Promise<HttpOutcome<null>>((resolve) => {
      release = () => {
        resolve({ kind: "success", data: null, maxAgeSeconds: 0 });
      };
    });
    const moveTrack = jest
      .fn<() => Promise<HttpOutcome<null>>>()
      .mockReturnValueOnce(held)
      .mockResolvedValue({ kind: "success", data: null, maxAgeSeconds: 0 });
    const { ctx } = await setup({ moveTrack });
    await screen.findByText("First Song");
    await act1("Third Song", "moveUp");
    await act1("Third Song", "moveUp");
    expect(titles()).toEqual(["Third Song", "First Song", "Second Song"]);
    await waitFor(() => {
      expect(ctx.moveTrack).toHaveBeenCalledTimes(1);
    });
    expect(ctx.moveTrack).toHaveBeenLastCalledWith("p1", 3, 2);
    await act(async () => {
      release();
      await held;
    });
    await waitFor(() => {
      expect(ctx.moveTrack).toHaveBeenCalledTimes(2);
    });
    expect(ctx.moveTrack).toHaveBeenLastCalledWith("p1", 2, 1);
  });

  it("removing a row hides it and sends one DELETE of its track id", async () => {
    const { ctx } = await setup();
    await screen.findByText("First Song");
    await fireEvent.press(screen.getByLabelText("Remove Second Song"));
    expect(titles()).toEqual(["First Song", "Third Song"]);
    await waitFor(() => {
      expect(ctx.removeTrackFromPlaylist).toHaveBeenCalledWith("p1", "t2");
    });
    expect(ctx.removeTrackFromPlaylist).toHaveBeenCalledTimes(1);
  });

  it("a failed move shows the error notice and redraws the server order", async () => {
    const { ctx } = await setup({ moveTrack: () => Promise.resolve(failure) });
    await screen.findByText("First Song");
    const loads = ctx.listPlaylistTracks.mock.calls.length;
    await act1("First Song", "moveDown");
    expect(await screen.findByTestId("edit-tracks-notice")).toBeTruthy();
    await waitFor(() => {
      expect(ctx.listPlaylistTracks.mock.calls.length).toBeGreaterThan(loads);
    });
    await waitFor(() => {
      expect(titles()).toEqual(["First Song", "Second Song", "Third Song"]);
    });
    expect(screen.getByText(en.common.error.generic)).toBeTruthy();
  });

  it("a failed remove does the same for a transport failure", async () => {
    const { ctx } = await setup({
      removeTrackFromPlaylist: () =>
        Promise.resolve({ kind: "transport_failure", cause: "network" }),
    });
    await screen.findByText("First Song");
    const loads = ctx.listPlaylistTracks.mock.calls.length;
    await fireEvent.press(screen.getByLabelText("Remove Second Song"));
    expect(await screen.findByTestId("edit-tracks-notice")).toBeTruthy();
    await waitFor(() => {
      expect(ctx.listPlaylistTracks.mock.calls.length).toBeGreaterThan(loads);
    });
    await waitFor(() => {
      expect(titles()).toEqual(["First Song", "Second Song", "Third Song"]);
    });
  });
});

describe("EditTracksScreen on the native list", () => {
  const nativeProps = () =>
    mockNative.props as {
      items: { title: string }[];
      onMove: (from: number, to: number) => void;
      onRemove: (index: number) => void;
    };

  it("takes the native list when it is available", async () => {
    mockNativeAvailable = true;
    await setup();
    expect(await screen.findByTestId("native-edit-list")).toBeTruthy();
    expect(nativeProps().items.map((item) => item.title)).toEqual([
      "First Song",
      "Second Song",
      "Third Song",
    ]);
  });

  it("a native move to the last place sends old 1, new n", async () => {
    mockNativeAvailable = true;
    const { ctx } = await setup();
    await screen.findByTestId("native-edit-list");
    await act(() => {
      nativeProps().onMove(0, 2);
    });
    await waitFor(() => {
      expect(ctx.moveTrack).toHaveBeenCalledWith("p1", 1, 3);
    });
    expect(nativeProps().items.map((item) => item.title)).toEqual([
      "Second Song",
      "Third Song",
      "First Song",
    ]);
  });

  it("a native delete sends one DELETE", async () => {
    mockNativeAvailable = true;
    const { ctx } = await setup();
    await screen.findByTestId("native-edit-list");
    await act(() => {
      nativeProps().onRemove(1);
    });
    await waitFor(() => {
      expect(ctx.removeTrackFromPlaylist).toHaveBeenCalledWith("p1", "t2");
    });
  });
});

describe("EditTracksScreen leaving", () => {
  it("Done waits for the pending request, then goes back", async () => {
    let release: () => void = () => undefined;
    const held = new Promise<HttpOutcome<null>>((resolve) => {
      release = () => {
        resolve({ kind: "success", data: null, maxAgeSeconds: 0 });
      };
    });
    const { ctx } = await setup({ moveTrack: () => held });
    await screen.findByText("First Song");
    await act1("First Song", "moveDown");
    await waitFor(() => {
      expect(ctx.moveTrack).toHaveBeenCalledTimes(1);
    });
    await fireEvent.press(done());
    expect(stateFlag(done(), "busy")).toBe(true);
    expect(mockBack).not.toHaveBeenCalled();
    await act(async () => {
      release();
      await held;
    });
    await waitFor(() => {
      expect(mockBack).toHaveBeenCalledTimes(1);
    });
  });

  it("leaving refreshes the playlist, the library and the playlists once the queue settles", async () => {
    const { invalidate, view } = await setup();
    await screen.findByText("First Song");
    await act1("First Song", "moveDown");
    await waitFor(() => {
      expect(screen.getByRole("button", { name: en.playlist.editTracks.done })).toBeTruthy();
    });
    await view.unmount();
    await waitFor(() => {
      const keys = invalidate.mock.calls.map((call) => call[0]?.queryKey);
      expect(keys).toEqual(
        expect.arrayContaining([["library"], ["playlists", "mine"], ["playlist", "user", "p1"]]),
      );
    });
  });

  it("editing the playlist that is the playback source leaves the queue unchanged", async () => {
    const { ctx, view } = await setup();
    const playable = three.map((track) => ({
      trackId: track.track_id,
      title: track.title,
      artists: track.artists,
      album: track.album,
      albumId: track.album_id,
      coverUrl: track.thumbnail_url,
      durationSeconds: track.duration_seconds,
    }));
    await act(async () => {
      await ctx.playback.playList(playable, 1, { kind: "playlist", id: "p1", name: "Road trip" });
    });
    const before = ctx.playback.getState();
    await screen.findByText("First Song");
    await act1("Third Song", "moveUp");
    await fireEvent.press(screen.getByLabelText("Remove First Song"));
    await view.unmount();
    await waitFor(() => {
      expect(ctx.removeTrackFromPlaylist).toHaveBeenCalled();
    });
    const after = ctx.playback.getState();
    expect(after.queue.map((track) => track.trackId)).toEqual(
      before.queue.map((track) => track.trackId),
    );
    expect(after.index).toBe(before.index);
  });
});

describe("EditTracksScreen in Spanish", () => {
  it("reads its labels in es", async () => {
    await i18n.changeLanguage("es");
    await setup();
    expect(await screen.findByText(es.playlist.editTracks.title)).toBeTruthy();
    expect(screen.getByRole("button", { name: es.playlist.editTracks.done })).toBeTruthy();
    expect(rowLabel("First Song").props.accessibilityValue).toEqual({ text: "1 de 3" });
    expect(screen.getByLabelText("Quitar First Song")).toBeTruthy();
  });
});

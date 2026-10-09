// apps/mobile/test/queries/usePlaylists.test.tsx
//
// Tests for the playlists query hook.
//
// Tested:
// - usePlaylists
// - useCreatePlaylist
// - usePlaylistsWithTrack
// - useAddToPlaylist, useRemoveFromPlaylist, useCreatePlaylistWithTrack
//
// What is covered:
// - the first page unwrapped, cache time from Cache-Control
// - creation refetching the library and the playlists, and a rejected creation surfacing its outcome
// - the playlist ids that hold a track, cache time from Cache-Control
// - add and remove invalidating the library, the playlists, that playlist and the membership; create-with-track refreshing them even when the add fails
//
// Run with: pnpm --filter @beatly/mobile test -- usePlaylists
//
// SEE: apps/mobile/src/queries/usePlaylists.ts

import { createHttpClient, createPlaylistsService } from "@beatly/core";
import type { HttpPort, LibraryEntry, PlaylistListItem } from "@beatly/core";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import type { Core } from "../../src/createCore.ts";
import { OutcomeError } from "../../src/queries/outcomeError.ts";
import { createTestQueryClient } from "../helpers/queryClient.ts";
import { useLibrary } from "../../src/queries/useLibrary.ts";
import {
  useAddToPlaylist,
  useCreatePlaylist,
  useCreatePlaylistWithTrack,
  usePlaylists,
  usePlaylistsWithTrack,
  useRemoveFromPlaylist,
} from "../../src/queries/usePlaylists.ts";
import {
  createdPlaylistFixture,
  likedEntryFixture,
  makeAuth,
  makeCore,
  makeLog,
  ownPlaylistEntryFixture,
  pageOf,
  playlistFixture,
  Wrapper,
} from "../helpers/core.tsx";

afterEach(() => {
  jest.useRealTimers();
});

const PAGE = { limit: 50, next_cursor: null, has_more: false, total: 1 };

function setup(headers: Record<string, string>) {
  const send = jest.fn<HttpPort["send"]>(() =>
    Promise.resolve({
      status: 200,
      headers,
      body: JSON.stringify({ ok: true, data: { items: [playlistFixture], page: PAGE } }),
    }),
  );
  const auth = makeAuth();
  const log = makeLog();
  const client = createHttpClient({ http: { send }, auth, log, baseUrl: "test://api" });
  const core: Core = { ...makeCore().core, auth, log, playlists: createPlaylistsService(client) };
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Wrapper core={core} client={queryClient}>
      {children}
    </Wrapper>
  );
  return { send, wrapper };
}

async function mountAndSettle(wrapper: ReturnType<typeof setup>["wrapper"]) {
  const rendered = await renderHook(() => usePlaylists(), { wrapper });
  await waitFor(() => {
    expect(rendered.result.current.isFetching).toBe(false);
  });
  return rendered;
}

describe("usePlaylists", () => {
  it("returns the playlists of the first page", async () => {
    const { wrapper } = setup({});
    const { result } = await mountAndSettle(wrapper);
    expect(result.current.data).toEqual([playlistFixture]);
  });

  it("keeps playlists fresh for their Cache-Control max-age", async () => {
    const { send, wrapper } = setup({ "cache-control": "max-age=60" });
    await mountAndSettle(wrapper);
    await mountAndSettle(wrapper);
    expect(send).toHaveBeenCalledTimes(1);
    jest.useFakeTimers({ advanceTimers: true });
    jest.advanceTimersByTime(61_000);
    await mountAndSettle(wrapper);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("treats playlists' private, no-cache as stale", async () => {
    const { send, wrapper } = setup({ "cache-control": "private, no-cache" });
    await mountAndSettle(wrapper);
    await mountAndSettle(wrapper);
    expect(send).toHaveBeenCalledTimes(2);
  });
});

describe("useCreatePlaylist", () => {
  const input = { title: "New one", is_public: false };
  const created: PlaylistListItem = { ...createdPlaylistFixture, thumbnail_urls: [] };
  const newEntry: LibraryEntry = {
    ...ownPlaylistEntryFixture,
    id: created.id,
    title: created.title,
  };

  function mount(options: Parameters<typeof makeCore>[0]) {
    const ctx = makeCore(options);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <Wrapper core={ctx.core}>{children}</Wrapper>
    );
    return { ctx, wrapper };
  }

  it("refetches the library and the caller's playlists after creating one", async () => {
    const { ctx, wrapper } = mount({
      listLibrary: jest
        .fn<() => ReturnType<typeof ctx.listLibrary>>()
        .mockResolvedValueOnce(pageOf([likedEntryFixture]))
        .mockResolvedValue(pageOf([likedEntryFixture, newEntry])),
      listPlaylists: jest
        .fn<() => ReturnType<typeof ctx.listPlaylists>>()
        .mockResolvedValueOnce(pageOf<PlaylistListItem>([]))
        .mockResolvedValue(pageOf([created])),
    });
    const { result } = await renderHook(
      () => ({ library: useLibrary(), playlists: usePlaylists(), create: useCreatePlaylist() }),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.library.data).toEqual([likedEntryFixture]);
      expect(result.current.playlists.data).toEqual([]);
    });
    await act(() => result.current.create.mutateAsync(input));
    await waitFor(() => {
      expect(result.current.library.data).toEqual([likedEntryFixture, newEntry]);
      expect(result.current.playlists.data).toEqual([created]);
    });
    expect(ctx.listLibrary).toHaveBeenCalledTimes(2);
    expect(ctx.listPlaylists).toHaveBeenCalledTimes(2);
    expect(ctx.createPlaylist).toHaveBeenCalledWith(input);
  });

  it("fails with the outcome when the API rejects the playlist", async () => {
    const rejected = { kind: "api_failure", reason: "invalid_request" } as const;
    const { ctx, wrapper } = mount({ createPlaylist: () => Promise.resolve(rejected) });
    const { result } = await renderHook(
      () => ({ library: useLibrary(), playlists: usePlaylists(), create: useCreatePlaylist() }),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.library.isFetching).toBe(false);
      expect(result.current.playlists.isFetching).toBe(false);
    });
    await act(() => {
      result.current.create.mutate(input);
    });
    await waitFor(() => {
      expect(result.current.create.isError).toBe(true);
    });
    const error = result.current.create.error;
    expect(error instanceof OutcomeError && error.outcome).toEqual(rejected);
    expect(ctx.listLibrary).toHaveBeenCalledTimes(1);
    expect(ctx.listPlaylists).toHaveBeenCalledTimes(1);
  });
});

describe("usePlaylistsWithTrack", () => {
  function setupMembership(headers: Record<string, string>) {
    const send = jest.fn<HttpPort["send"]>(() =>
      Promise.resolve({
        status: 200,
        headers,
        body: JSON.stringify({ ok: true, data: { playlist_ids: ["p1"] } }),
      }),
    );
    const auth = makeAuth();
    const log = makeLog();
    const client = createHttpClient({ http: { send }, auth, log, baseUrl: "test://api" });
    const core: Core = {
      ...makeCore().core,
      auth,
      log,
      playlists: createPlaylistsService(client),
    };
    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <Wrapper core={core} client={queryClient}>
        {children}
      </Wrapper>
    );
    return { send, wrapper };
  }

  async function mountMembership(wrapper: ReturnType<typeof setupMembership>["wrapper"]) {
    const rendered = await renderHook(() => usePlaylistsWithTrack("t 1"), { wrapper });
    await waitFor(() => {
      expect(rendered.result.current.isFetching).toBe(false);
    });
    return rendered;
  }

  it("returns the playlist ids", async () => {
    const { send, wrapper } = setupMembership({});
    const { result } = await mountMembership(wrapper);
    expect(result.current.data).toEqual(["p1"]);
    expect(send.mock.calls[0]?.[0].url).toBe("test://api/playlists/owned-with-track/t%201");
  });

  it("keeps it fresh for its Cache-Control max-age", async () => {
    const { send, wrapper } = setupMembership({ "cache-control": "max-age=60" });
    await mountMembership(wrapper);
    await mountMembership(wrapper);
    expect(send).toHaveBeenCalledTimes(1);
    jest.useFakeTimers({ advanceTimers: true });
    jest.advanceTimersByTime(61_000);
    await mountMembership(wrapper);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("treats private, no-cache as stale at once", async () => {
    const { send, wrapper } = setupMembership({ "cache-control": "private, no-cache" });
    await mountMembership(wrapper);
    await mountMembership(wrapper);
    expect(send).toHaveBeenCalledTimes(2);
  });
});

describe("the playlist write mutations", () => {
  const input = {
    track_id: "t1",
    title: "Song",
    artists: [{ id: "ar1", name: "Artist" }],
    album: "Album",
    album_id: "al1",
    thumbnail_url: "test://img/t1",
    duration_seconds: 200,
  };

  function mount(options: Parameters<typeof makeCore>[0] = {}) {
    const ctx = makeCore(options);
    const queryClient = createTestQueryClient();
    const invalidate = jest.spyOn(queryClient, "invalidateQueries");
    const wrapper = ({ children }: { children: ReactNode }) => (
      <Wrapper core={ctx.core} client={queryClient}>
        {children}
      </Wrapper>
    );
    const keys = () => invalidate.mock.calls.map((call) => call[0]?.queryKey);
    return { ctx, wrapper, keys };
  }

  const refreshed = [
    ["library"],
    ["playlists", "mine"],
    ["playlist", "user", "p1"],
    ["playlists", "withTrack", "t1"],
  ];

  it("add invalidates the library, the playlists, that playlist and its membership on success", async () => {
    const { ctx, wrapper, keys } = mount();
    const { result } = await renderHook(() => useAddToPlaylist(), { wrapper });
    await act(() => result.current.mutateAsync({ playlist: playlistFixture, input }));
    expect(ctx.addTrackToPlaylist).toHaveBeenCalledWith("p1", input);
    expect(keys()).toEqual(expect.arrayContaining(refreshed));
  });

  it("add refreshes nothing when it fails", async () => {
    const { wrapper, keys } = mount({
      addTrackToPlaylist: () =>
        Promise.resolve({ kind: "api_failure", reason: "playlist_not_found" }),
    });
    const { result } = await renderHook(() => useAddToPlaylist(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ playlist: playlistFixture, input }).catch(() => undefined);
    });
    expect(keys()).toEqual([]);
  });

  it("remove invalidates the library, the playlists, that playlist and its membership on success", async () => {
    const { ctx, wrapper, keys } = mount();
    const { result } = await renderHook(() => useRemoveFromPlaylist(), { wrapper });
    await act(() => result.current.mutateAsync({ playlistId: "p1", trackId: "t1" }));
    expect(ctx.removeTrackFromPlaylist).toHaveBeenCalledWith("p1", "t1");
    expect(keys()).toEqual(expect.arrayContaining(refreshed));
  });

  it("create-with-track refreshes the library and the playlists even when the add fails", async () => {
    const { ctx, wrapper, keys } = mount({
      createPlaylistWithTrack: () =>
        Promise.resolve({ kind: "api_failure", reason: "upstream_error" }),
    });
    const { result } = await renderHook(() => useCreatePlaylistWithTrack(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ title: "New one", input }).catch(() => undefined);
    });
    expect(ctx.createPlaylistWithTrack).toHaveBeenCalledWith("New one", input);
    expect(keys()).toEqual(
      expect.arrayContaining([
        ["library"],
        ["playlists", "mine"],
        ["playlists", "withTrack", "t1"],
      ]),
    );
    expect(result.current.isError).toBe(true);
  });
});

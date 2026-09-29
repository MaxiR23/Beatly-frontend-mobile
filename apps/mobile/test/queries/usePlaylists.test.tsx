// apps/mobile/test/queries/usePlaylists.test.tsx
//
// Tests for the playlists query hook.
//
// Tested:
// - usePlaylists
// - useCreatePlaylist
//
// What is covered:
// - the first page unwrapped, cache time from Cache-Control
// - creation refetching the library and the playlists, and a rejected creation surfacing its outcome
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
import { createQueryClient } from "../../src/queries/queryClient.ts";
import { useLibrary } from "../../src/queries/useLibrary.ts";
import { useCreatePlaylist, usePlaylists } from "../../src/queries/usePlaylists.ts";
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
  const queryClient = createQueryClient();
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

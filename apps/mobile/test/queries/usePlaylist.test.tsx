// apps/mobile/test/queries/usePlaylist.test.tsx
//
// Tests for the playlist query hooks.
//
// Tested:
// - usePlaylistHeader
// - usePlaylistTracks
//
// What is covered:
// - the route each source asks for and the source in the data
// - cache time from Cache-Control for the header and the tracks
// - paging own and liked tracks with the cursor, no tracks request for a genre playlist
// - OutcomeError carrying playlist_not_found
//
// Run with: pnpm --filter @beatly/mobile test -- usePlaylist
//
// SEE: apps/mobile/src/queries/usePlaylist.ts

import {
  createGenresService,
  createHttpClient,
  createPlaylistsService,
  createPublicService,
} from "@beatly/core";
import type { HttpPort } from "@beatly/core";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import type { Core } from "../../src/createCore.ts";
import { OutcomeError } from "../../src/queries/outcomeError.ts";
import { createQueryClient } from "../../src/queries/queryClient.ts";
import {
  usePlaylistHeader,
  usePlaylistTracks,
  type PlaylistSource,
} from "../../src/queries/usePlaylist.ts";
import {
  likedDetailFixture,
  makeAuth,
  makeCore,
  makeLog,
  playlistDetailFixture,
  playlistTrackFixture,
  publicGenrePlaylistFixture,
  Wrapper,
} from "../helpers/core.tsx";

afterEach(() => {
  jest.useRealTimers();
});

function page(items: unknown[], next: string | null) {
  return { items, page: { limit: 50, next_cursor: next, has_more: next !== null, total: 2 } };
}

function bodyFor(url: string) {
  if (url.includes("/public/genre-playlists/")) {
    return { ...publicGenrePlaylistFixture, tracks: [playlistTrackFixture] };
  }
  if (url.endsWith("/tracks") || url.includes("/tracks?")) {
    const second = url.includes("cursor=c1");
    const hasNext = !second && url.includes("/playlists/");
    return page(
      [second ? { ...playlistTrackFixture, track_id: "t2", position: 2 } : playlistTrackFixture],
      hasNext ? "c1" : null,
    );
  }
  return url.endsWith("/playlists/liked") ? likedDetailFixture : playlistDetailFixture;
}

function setup(headers: Record<string, string>, response?: { status: number; body: unknown }) {
  const send = jest.fn<HttpPort["send"]>((request) =>
    Promise.resolve({
      status: response?.status ?? 200,
      headers,
      body: JSON.stringify(response?.body ?? { ok: true, data: bodyFor(request.url) }),
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
    genres: createGenresService(client),
    publicShare: createPublicService(client),
  };
  const queryClient = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Wrapper core={core} client={queryClient}>
      {children}
    </Wrapper>
  );
  return { send, wrapper };
}

type Wrap = ReturnType<typeof setup>["wrapper"];

async function mountHeader(wrapper: Wrap, source: PlaylistSource = "user", id = "p1") {
  const rendered = await renderHook(() => usePlaylistHeader(source, id), { wrapper });
  await waitFor(() => {
    expect(rendered.result.current.isFetching).toBe(false);
  });
  return rendered;
}

async function mountTracks(wrapper: Wrap, source: PlaylistSource = "user", id = "p1") {
  const rendered = await renderHook(() => usePlaylistTracks(source, id), { wrapper });
  await waitFor(() => {
    expect(rendered.result.current.isFetching).toBe(false);
  });
  return rendered;
}

describe("usePlaylistHeader", () => {
  it("requests /playlists/p1 for an own playlist", async () => {
    const { send, wrapper } = setup({});
    const { result } = await mountHeader(wrapper);
    expect(send.mock.calls[0]?.[0].url).toBe("test://api/playlists/p1");
    expect(result.current.data).toEqual({ source: "user", playlist: playlistDetailFixture });
  });

  it("requests /playlists/liked for liked", async () => {
    const { send, wrapper } = setup({});
    const { result } = await mountHeader(wrapper, "liked", "liked");
    expect(send.mock.calls[0]?.[0].url).toBe("test://api/playlists/liked");
    expect(result.current.data).toEqual({ source: "liked", playlist: likedDetailFixture });
  });

  it("requests /public/genre-playlists/gp1 for a genre playlist", async () => {
    const { send, wrapper } = setup({});
    const { result } = await mountHeader(wrapper, "genre", "gp1");
    expect(send.mock.calls[0]?.[0].url).toBe("test://api/public/genre-playlists/gp1");
    expect(result.current.data).toEqual({
      source: "genre",
      playlist: { ...publicGenrePlaylistFixture, tracks: [playlistTrackFixture] },
    });
    expect(
      result.current.data?.source === "genre" && result.current.data.playlist.tracks,
    ).toHaveLength(1);
  });

  it("keeps a playlist header fresh for its Cache-Control max-age", async () => {
    const { send, wrapper } = setup({ "cache-control": "max-age=60" });
    await mountHeader(wrapper);
    await mountHeader(wrapper);
    expect(send).toHaveBeenCalledTimes(1);
    jest.useFakeTimers({ advanceTimers: true });
    jest.advanceTimersByTime(61_000);
    await mountHeader(wrapper);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("treats a playlist header's private, no-cache as stale", async () => {
    const { send, wrapper } = setup({ "cache-control": "private, no-cache" });
    await mountHeader(wrapper);
    await mountHeader(wrapper);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("treats a genre playlist header's no-store as stale", async () => {
    const { send, wrapper } = setup({ "cache-control": "no-store" });
    await mountHeader(wrapper, "genre", "gp1");
    await mountHeader(wrapper, "genre", "gp1");
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("throws an OutcomeError carrying playlist_not_found", async () => {
    const { wrapper } = setup(
      {},
      { status: 404, body: { ok: false, reason: "playlist_not_found" } },
    );
    const { result } = await mountHeader(wrapper);
    const error = result.current.error;
    expect(error).toBeInstanceOf(OutcomeError);
    expect(error instanceof OutcomeError && error.outcome).toEqual({
      kind: "api_failure",
      reason: "playlist_not_found",
    });
  });
});

describe("usePlaylistTracks", () => {
  it("pages an own playlist's tracks with the cursor", async () => {
    const { send, wrapper } = setup({});
    const { result } = await mountTracks(wrapper);
    expect(send.mock.calls[0]?.[0].url).toBe("test://api/playlists/p1/tracks");
    expect(result.current.data).toHaveLength(1);
    expect(result.current.hasNextPage).toBe(true);
    await act(async () => {
      result.current.loadMore();
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(result.current.data).toHaveLength(2);
    });
    expect(send.mock.calls[1]?.[0].url).toContain("cursor=c1");
  });

  it("pages liked tracks with the cursor", async () => {
    const { send, wrapper } = setup({});
    const { result } = await mountTracks(wrapper, "liked", "liked");
    expect(send.mock.calls[0]?.[0].url).toBe("test://api/playlists/liked/tracks");
    await act(async () => {
      result.current.loadMore();
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(result.current.data).toHaveLength(2);
    });
    expect(send.mock.calls[1]?.[0].url).toContain("cursor=c1");
  });

  it("does not request tracks for a genre playlist", async () => {
    const { send, wrapper } = setup({});
    const { result } = await mountTracks(wrapper, "genre", "gp1");
    expect(send).not.toHaveBeenCalled();
    expect(result.current.isPending).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it("keeps tracks fresh for their Cache-Control max-age", async () => {
    const { send, wrapper } = setup({ "cache-control": "max-age=60" });
    await mountTracks(wrapper);
    await mountTracks(wrapper);
    expect(send).toHaveBeenCalledTimes(1);
    jest.useFakeTimers({ advanceTimers: true });
    jest.advanceTimersByTime(61_000);
    await mountTracks(wrapper);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("treats tracks' no-store as stale", async () => {
    const { send, wrapper } = setup({ "cache-control": "no-store" });
    await mountTracks(wrapper);
    await mountTracks(wrapper);
    expect(send).toHaveBeenCalledTimes(2);
  });
});

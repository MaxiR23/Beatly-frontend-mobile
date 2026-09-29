// apps/mobile/test/queries/usePlaylists.test.tsx
//
// Tests for the playlists query hook.
//
// Tested:
// - usePlaylists
//
// What is covered:
// - the first page unwrapped, cache time from Cache-Control
//
// Run with: pnpm --filter @beatly/mobile test -- usePlaylists
//
// SEE: apps/mobile/src/queries/usePlaylists.ts

import { createHttpClient, createPlaylistsService } from "@beatly/core";
import type { HttpPort } from "@beatly/core";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import type { Core } from "../../src/createCore.ts";
import { createQueryClient } from "../../src/queries/queryClient.ts";
import { usePlaylists } from "../../src/queries/usePlaylists.ts";
import { makeAuth, makeCore, makeLog, playlistFixture, Wrapper } from "../helpers/core.tsx";

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

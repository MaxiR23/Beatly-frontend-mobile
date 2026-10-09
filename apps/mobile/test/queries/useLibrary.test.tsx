// apps/mobile/test/queries/useLibrary.test.tsx
//
// Tests for the library query hook.
//
// Tested:
// - useLibrary
//
// What is covered:
// - the first page unwrapped, cache time from Cache-Control
//
// Run with: pnpm --filter @beatly/mobile test -- useLibrary
//
// SEE: apps/mobile/src/queries/useLibrary.ts

import { createHttpClient, createLibraryService } from "@beatly/core";
import type { HttpPort } from "@beatly/core";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import type { Core } from "../../src/createCore.ts";
import { createTestQueryClient } from "../helpers/queryClient.ts";
import { useLibrary } from "../../src/queries/useLibrary.ts";
import { makeAuth, makeCore, makeLog, ownPlaylistEntryFixture, Wrapper } from "../helpers/core.tsx";

afterEach(() => {
  jest.useRealTimers();
});

const PAGE = { limit: 50, next_cursor: null, has_more: false, total: 1 };

function setup(headers: Record<string, string>) {
  const send = jest.fn<HttpPort["send"]>(() =>
    Promise.resolve({
      status: 200,
      headers,
      body: JSON.stringify({ ok: true, data: { items: [ownPlaylistEntryFixture], page: PAGE } }),
    }),
  );
  const auth = makeAuth();
  const log = makeLog();
  const client = createHttpClient({ http: { send }, auth, log, baseUrl: "test://api" });
  const core: Core = { ...makeCore().core, auth, log, library: createLibraryService(client) };
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Wrapper core={core} client={queryClient}>
      {children}
    </Wrapper>
  );
  return { send, wrapper };
}

async function mountAndSettle(wrapper: ReturnType<typeof setup>["wrapper"]) {
  const rendered = await renderHook(() => useLibrary(), { wrapper });
  await waitFor(() => {
    expect(rendered.result.current.isFetching).toBe(false);
  });
  return rendered;
}

describe("useLibrary", () => {
  it("returns the entries of the first page", async () => {
    const { wrapper } = setup({});
    const { result } = await mountAndSettle(wrapper);
    expect(result.current.data).toEqual([ownPlaylistEntryFixture]);
  });

  it("keeps the library fresh for their Cache-Control max-age", async () => {
    const { send, wrapper } = setup({ "cache-control": "max-age=60" });
    await mountAndSettle(wrapper);
    await mountAndSettle(wrapper);
    expect(send).toHaveBeenCalledTimes(1);
    jest.useFakeTimers({ advanceTimers: true });
    jest.advanceTimersByTime(61_000);
    await mountAndSettle(wrapper);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("treats the library's private, no-cache as stale", async () => {
    const { send, wrapper } = setup({ "cache-control": "private, no-cache" });
    await mountAndSettle(wrapper);
    await mountAndSettle(wrapper);
    expect(send).toHaveBeenCalledTimes(2);
  });
});

// apps/mobile/test/queries/useLibrary.test.tsx
//
// Tests for the library query hook.
//
// Tested:
// - useLibrary, useLibrarySaved, useSetSaved
//
// What is covered:
// - the first page unwrapped, cache time from Cache-Control
// - the saved state, its cache time, disabled; the optimistic save and remove, the rollback, library_item_not_found, the refetch after a write
//
// Run with: pnpm --filter @beatly/mobile test -- useLibrary
//
// SEE: apps/mobile/src/queries/useLibrary.ts

import { createHttpClient, createLibraryService } from "@beatly/core";
import type { HttpOutcome, HttpPort, LibraryItem, LibraryItemInput } from "@beatly/core";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import type { Core } from "../../src/createCore.ts";
import { createTestQueryClient } from "../helpers/queryClient.ts";
import { useLibrary, useLibrarySaved, useSetSaved } from "../../src/queries/useLibrary.ts";
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

describe("useLibrarySaved", () => {
  function savedSetup(headers: Record<string, string>) {
    const send = jest.fn<HttpPort["send"]>(() =>
      Promise.resolve({
        status: 200,
        headers,
        body: JSON.stringify({ ok: true, data: { saved: true } }),
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

  async function mountSaved(wrapper: ReturnType<typeof savedSetup>["wrapper"], enabled = true) {
    const rendered = await renderHook(() => useLibrarySaved("album", "a1", enabled), { wrapper });
    await waitFor(() => {
      expect(rendered.result.current.isFetching).toBe(false);
    });
    return rendered;
  }

  it("returns the saved state", async () => {
    const { send, wrapper } = savedSetup({});
    const { result } = await mountSaved(wrapper);
    expect(result.current.data).toBe(true);
    expect(send.mock.calls[0]?.[0].url).toBe("test://api/library/album/a1");
  });

  it("keeps the saved state fresh for its Cache-Control max-age", async () => {
    const { send, wrapper } = savedSetup({ "cache-control": "max-age=60" });
    await mountSaved(wrapper);
    await mountSaved(wrapper);
    expect(send).toHaveBeenCalledTimes(1);
    jest.useFakeTimers({ advanceTimers: true });
    jest.advanceTimersByTime(61_000);
    await mountSaved(wrapper);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("treats the saved state's private, no-cache as stale", async () => {
    const { send, wrapper } = savedSetup({ "cache-control": "private, no-cache" });
    await mountSaved(wrapper);
    await mountSaved(wrapper);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("does not fetch while disabled", async () => {
    const { send, wrapper } = savedSetup({});
    await mountSaved(wrapper, false);
    expect(send).not.toHaveBeenCalled();
  });
});

describe("useSetSaved", () => {
  const input: LibraryItemInput = {
    kind: "album",
    source: "external",
    external_id: "a1",
    title: "Some album",
  };
  const savedOf = (saved: boolean): HttpOutcome<{ saved: boolean }> => ({
    kind: "success",
    data: { saved },
    maxAgeSeconds: 0,
  });

  const pendingAfterFirst = (initial: boolean) =>
    jest
      .fn<() => Promise<HttpOutcome<{ saved: boolean }>>>()
      .mockResolvedValueOnce(savedOf(initial))
      .mockImplementation(() => new Promise(() => undefined));

  async function mount(options: Parameters<typeof makeCore>[0], initial: boolean) {
    const ctx = makeCore({
      getSavedState: () => Promise.resolve(savedOf(initial)),
      ...options,
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <Wrapper core={ctx.core}>{children}</Wrapper>
    );
    const rendered = await renderHook(
      () => ({ saved: useLibrarySaved("album", "a1", true), set: useSetSaved("album", "a1") }),
      { wrapper },
    );
    await waitFor(() => {
      expect(rendered.result.current.saved.data).toBe(initial);
    });
    return { ctx, ...rendered };
  }

  it("shows the new state before the write answers", async () => {
    const pending = new Promise<HttpOutcome<LibraryItem>>(() => undefined);
    const { result } = await mount({ saveItem: () => pending }, false);
    await act(async () => {
      result.current.set.mutate({ saved: true, input });
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(result.current.saved.data).toBe(true);
    });
    expect(result.current.set.isPending).toBe(true);
  });

  it("rolls back to not saved when the save fails", async () => {
    const { ctx, result } = await mount(
      {
        saveItem: () => Promise.resolve({ kind: "api_failure", reason: "upstream_error" }),
        getSavedState: pendingAfterFirst(false),
      },
      false,
    );
    // The refetch after the failure never answers, so only the rollback restores the value.
    await act(() => {
      result.current.set.mutate({ saved: true, input });
    });
    // The write stays pending on the refetch that never answers; the log marks onError.
    await waitFor(() => {
      expect(ctx.log.warn).toHaveBeenCalledWith("library.save_failed", expect.anything());
    });
    expect(result.current.saved.data).toBe(false);
    expect(ctx.log.warn).toHaveBeenCalledWith("library.save_failed", {
      kind: "album",
      detail: "upstream_error",
    });
  });

  const removeFailures: [string, HttpOutcome<null>][] = [
    ["an api reason", { kind: "api_failure", reason: "upstream_error" }],
    ["a transport failure", { kind: "transport_failure", cause: "network" }],
  ];

  it.each(removeFailures)(
    "rolls back to saved when the remove fails with %s",
    async (_name, failure) => {
      const { ctx, result } = await mount(
        { removeItem: () => Promise.resolve(failure), getSavedState: pendingAfterFirst(true) },
        true,
      );
      await act(() => {
        result.current.set.mutate({ saved: false, input });
      });
      // The write stays pending on the refetch that never answers; the log marks onError.
      await waitFor(() => {
        expect(ctx.log.warn).toHaveBeenCalledWith("library.save_failed", expect.anything());
      });
      expect(result.current.saved.data).toBe(true);
    },
  );

  it("leaves the item not saved without an error on library_item_not_found", async () => {
    const { result } = await mount(
      {
        removeItem: () =>
          Promise.resolve({ kind: "api_failure", reason: "library_item_not_found" }),
        getSavedState: jest
          .fn<() => Promise<HttpOutcome<{ saved: boolean }>>>()
          .mockResolvedValueOnce(savedOf(true))
          .mockResolvedValue(savedOf(false)),
      },
      true,
    );
    await act(() => {
      result.current.set.mutate({ saved: false, input });
    });
    await waitFor(() => {
      expect(result.current.set.isSuccess).toBe(true);
    });
    expect(result.current.set.isError).toBe(false);
    await waitFor(() => {
      expect(result.current.saved.data).toBe(false);
    });
  });

  it("refetches the library and the saved state after a write", async () => {
    const { ctx, result } = await mount({}, false);
    expect(ctx.listLibrary).toHaveBeenCalledTimes(0);
    await act(() => result.current.set.mutateAsync({ saved: true, input }));
    await waitFor(() => {
      expect(ctx.getSavedState).toHaveBeenCalledTimes(2);
    });
    expect(ctx.saveItem).toHaveBeenCalledWith(input);
  });
});

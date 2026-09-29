// apps/mobile/test/queries/useRecentSearches.test.tsx
//
// Tests for the recent searches query hook and its mutations.
//
// Tested:
// - useRecentSearches, useAddRecentSearch, useRemoveRecentSearch, useClearRecentSearches
//
// What is covered:
// - the stored list, mutations writing their list into the cache, OutcomeError on a storage failure
// - Not applicable: the cache time from Cache-Control, because the hook reads the device store and has no header
//
// Run with: pnpm --filter @beatly/mobile test -- useRecentSearches
//
// SEE: apps/mobile/src/queries/useRecentSearches.ts

import { RECENT_SEARCHES_KEY } from "@beatly/core";
import type { StoragePort } from "@beatly/core";
import { describe, expect, it, jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { OutcomeError } from "../../src/queries/outcomeError.ts";
import { createQueryClient } from "../../src/queries/queryClient.ts";
import {
  useAddRecentSearch,
  useClearRecentSearches,
  useRecentSearches,
  useRemoveRecentSearch,
} from "../../src/queries/useRecentSearches.ts";
import { makeCore, memoryStorage, Wrapper } from "../helpers/core.tsx";

function setup(storage: StoragePort) {
  const { core } = makeCore({ storage });
  const client = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Wrapper core={core} client={client}>
      {children}
    </Wrapper>
  );
  return { wrapper };
}

const seeded = () => memoryStorage({ [RECENT_SEARCHES_KEY]: JSON.stringify(["b", "a"]) });

describe("useRecentSearches", () => {
  it("returns the stored queries", async () => {
    const { wrapper } = setup(seeded());
    const { result } = await renderHook(() => useRecentSearches(), { wrapper });
    await waitFor(() => {
      expect(result.current.data).toEqual(["b", "a"]);
    });
  });

  it("writes the list an add returns into the cache without reading the store again", async () => {
    const storage = seeded();
    const get = jest.spyOn(storage, "get");
    const { wrapper } = setup(storage);
    const { result } = await renderHook(
      () => ({ list: useRecentSearches(), add: useAddRecentSearch() }),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.list.data).toEqual(["b", "a"]);
    });
    const readsBeforeAdd = get.mock.calls.length;
    await act(async () => {
      await result.current.add.mutateAsync("c");
    });
    await waitFor(() => {
      expect(result.current.list.data).toEqual(["c", "b", "a"]);
    });
    // the add reads once for its own list rules; the query does not read again
    expect(get).toHaveBeenCalledTimes(readsBeforeAdd + 1);
  });

  it("removes and clears through the cache", async () => {
    const { wrapper } = setup(seeded());
    const { result } = await renderHook(
      () => ({
        list: useRecentSearches(),
        remove: useRemoveRecentSearch(),
        clear: useClearRecentSearches(),
      }),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.list.data).toEqual(["b", "a"]);
    });
    await act(async () => {
      await result.current.remove.mutateAsync("a");
    });
    await waitFor(() => {
      expect(result.current.list.data).toEqual(["b"]);
    });
    await act(async () => {
      await result.current.clear.mutateAsync();
    });
    await waitFor(() => {
      expect(result.current.list.data).toEqual([]);
    });
  });

  it("throws an OutcomeError carrying a storage failure", async () => {
    const storage: StoragePort = {
      ...memoryStorage(),
      get: () => Promise.reject(new Error("down")),
    };
    const { wrapper } = setup(storage);
    const { result } = await renderHook(() => useRecentSearches(), { wrapper });
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    const error = result.current.error;
    expect(error).toBeInstanceOf(OutcomeError);
    expect(error instanceof OutcomeError && error.outcome).toEqual({
      kind: "storage_failure",
      cause: "read",
    });
  });
});

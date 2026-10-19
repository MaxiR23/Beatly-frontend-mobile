// apps/mobile/test/queries/useAutoplay.test.tsx
//
// Tests for the autoplay setting query hook and its mutation.
//
// Tested:
// - useAutoplaySetting, useSetAutoplay
//
// What is covered:
// - on from an empty store and the stored value otherwise, the mutation writing its value into the cache, OutcomeError on a storage failure
// - Not applicable: the cache time from Cache-Control, because the hook reads the device store and has no header
//
// Run with: pnpm --filter @beatly/mobile test -- useAutoplay
//
// SEE: apps/mobile/src/queries/useAutoplay.ts

import { AUTOPLAY_KEY } from "@beatly/core";
import type { StoragePort } from "@beatly/core";
import { describe, expect, it, jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { OutcomeError } from "../../src/queries/outcomeError.ts";
import { useAutoplaySetting, useSetAutoplay } from "../../src/queries/useAutoplay.ts";
import { createTestQueryClient } from "../helpers/queryClient.ts";
import { makeCore, memoryStorage, Wrapper } from "../helpers/core.tsx";

function setup(storage: StoragePort) {
  const { core } = makeCore({ storage });
  const client = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Wrapper core={core} client={client}>
      {children}
    </Wrapper>
  );
  return { wrapper };
}

describe("useAutoplaySetting", () => {
  it("reads on from an empty store and the stored value otherwise", async () => {
    const empty = setup(memoryStorage());
    const fresh = await renderHook(() => useAutoplaySetting(), { wrapper: empty.wrapper });
    await waitFor(() => {
      expect(fresh.result.current.data).toBe(true);
    });
    const off = setup(memoryStorage({ [AUTOPLAY_KEY]: "off" }));
    const stored = await renderHook(() => useAutoplaySetting(), { wrapper: off.wrapper });
    await waitFor(() => {
      expect(stored.result.current.data).toBe(false);
    });
  });

  it("throws an OutcomeError carrying the storage failure", async () => {
    const storage: StoragePort = {
      ...memoryStorage(),
      get: () => Promise.reject(new Error("unreadable")),
    };
    const { wrapper } = setup(storage);
    const { result } = await renderHook(() => useAutoplaySetting(), { wrapper });
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

describe("useSetAutoplay", () => {
  it("writes the new value into the cache without reading the store again", async () => {
    const storage = memoryStorage();
    const get = jest.spyOn(storage, "get");
    const { wrapper } = setup(storage);
    const { result } = await renderHook(
      () => ({ setting: useAutoplaySetting(), set: useSetAutoplay() }),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.setting.data).toBe(true);
    });
    const reads = get.mock.calls.length;
    await act(async () => {
      await result.current.set.mutateAsync(false);
    });
    await waitFor(() => {
      expect(result.current.setting.data).toBe(false);
    });
    expect(get).toHaveBeenCalledTimes(reads);
    expect(await storage.get(AUTOPLAY_KEY)).toBe("off");
  });
});

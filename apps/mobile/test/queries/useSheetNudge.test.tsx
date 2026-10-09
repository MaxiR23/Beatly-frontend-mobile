// apps/mobile/test/queries/useSheetNudge.test.tsx
//
// Tests for the sheet nudge hook.
//
// Tested:
// - useSheetNudge
//
// What is covered:
// - the first opening nudging, three stored openings not nudging, an unreadable store not nudging
// - Not applicable: the cache time from Cache-Control, because it is a mutation of local data with no header
//
// Run with: pnpm --filter @beatly/mobile test -- useSheetNudge
//
// SEE: apps/mobile/src/queries/useSheetNudge.ts

import { SHEET_NUDGE_KEY } from "@beatly/core";
import type { StoragePort } from "@beatly/core";
import { describe, expect, it } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { createTestQueryClient } from "../helpers/queryClient.ts";
import { useSheetNudge } from "../../src/queries/useSheetNudge.ts";
import { makeCore, memoryStorage, Wrapper } from "../helpers/core.tsx";

function setup(storage: StoragePort) {
  const { core, log } = makeCore({ storage });
  const client = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Wrapper core={core} client={client}>
      {children}
    </Wrapper>
  );
  return { wrapper, log };
}

describe("useSheetNudge", () => {
  it("is true on the first opening", async () => {
    const storage = memoryStorage();
    const { wrapper } = setup(storage);
    const { result } = await renderHook(() => useSheetNudge(), { wrapper });
    await waitFor(() => {
      expect(result.current).toBe(true);
    });
    expect(await storage.get(SHEET_NUDGE_KEY)).toBe("1");
  });

  it("is false once three openings are stored", async () => {
    const storage = memoryStorage({ [SHEET_NUDGE_KEY]: "3" });
    const { wrapper } = setup(storage);
    const { result } = await renderHook(() => useSheetNudge(), { wrapper });
    await waitFor(async () => {
      expect(await storage.get(SHEET_NUDGE_KEY)).toBe("3");
    });
    expect(result.current).toBe(false);
  });

  it("is false when the store cannot be read", async () => {
    const storage: StoragePort = {
      ...memoryStorage(),
      get: () => Promise.reject(new Error("storage down")),
    };
    const { wrapper, log } = setup(storage);
    const { result } = await renderHook(() => useSheetNudge(), { wrapper });
    await waitFor(() => {
      expect(log.warn).toHaveBeenCalledWith("sheet_nudge.read");
    });
    expect(result.current).toBe(false);
  });
});

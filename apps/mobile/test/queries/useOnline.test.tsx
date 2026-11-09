// apps/mobile/test/queries/useOnline.test.tsx
//
// Tests for the connection hook.
//
// Tested:
// - useOnline
//
// What is covered:
// - it reads TanStack Query's onlineManager and follows it going offline and back
//
// Run with: pnpm --filter @beatly/mobile test -- useOnline
//
// SEE: apps/mobile/src/queries/useOnline.ts

import { afterEach, describe, expect, it } from "@jest/globals";
import { onlineManager } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react-native";

import { useOnline } from "../../src/queries/useOnline.ts";

afterEach(() => {
  onlineManager.setOnline(true);
});

describe("useOnline", () => {
  it("is true by default", async () => {
    const { result } = await renderHook(() => useOnline());
    expect(result.current).toBe(true);
  });

  it("follows the onlineManager offline and back online", async () => {
    const { result } = await renderHook(() => useOnline());
    await act(() => {
      onlineManager.setOnline(false);
    });
    expect(result.current).toBe(false);
    await act(() => {
      onlineManager.setOnline(true);
    });
    expect(result.current).toBe(true);
  });
});

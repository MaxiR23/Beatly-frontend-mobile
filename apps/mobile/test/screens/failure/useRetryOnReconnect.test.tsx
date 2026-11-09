// apps/mobile/test/screens/failure/useRetryOnReconnect.test.tsx
//
// Tests for the retry on reconnect.
//
// Tested:
// - useRetryOnReconnect
//
// What is covered:
// - an offline cause and the connection going false then true calls retry once
// - another cause never calls it; online staying online never calls it
// - a cause that stopped being offline in the render the connection returned still retries
//
// Run with: pnpm --filter @beatly/mobile test -- useRetryOnReconnect
//
// SEE: apps/mobile/src/screens/failure/useRetryOnReconnect.ts

import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { onlineManager } from "@tanstack/react-query";
import type { ErrorCause } from "@beatly/ui/native";
import { act, renderHook } from "@testing-library/react-native";

import { useRetryOnReconnect } from "../../../src/screens/failure/useRetryOnReconnect.ts";
import { useOnline } from "../../../src/queries/useOnline.ts";

afterEach(() => {
  onlineManager.setOnline(true);
});

const goOffline = () =>
  act(() => {
    onlineManager.setOnline(false);
  });
const goOnline = () =>
  act(() => {
    onlineManager.setOnline(true);
  });

describe("useRetryOnReconnect", () => {
  it("retries once when the connection returns on the offline cause", async () => {
    const retry = jest.fn();
    await renderHook(() => {
      useRetryOnReconnect("offline", retry);
    });
    await goOffline();
    expect(retry).not.toHaveBeenCalled();
    await goOnline();
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it.each<ErrorCause | null>(["slow", "server", null])(
    "never retries on the %s cause",
    async (cause) => {
      const retry = jest.fn();
      await renderHook(() => {
        useRetryOnReconnect(cause, retry);
      });
      await goOffline();
      await goOnline();
      expect(retry).not.toHaveBeenCalled();
    },
  );

  it("never retries when it stays online", async () => {
    const retry = jest.fn();
    const { rerender } = await renderHook(() => {
      useRetryOnReconnect("offline", retry);
    });
    await rerender({});
    expect(retry).not.toHaveBeenCalled();
  });

  it("retries when the cause is derived from the connection and changes as it returns", async () => {
    const retry = jest.fn();
    await renderHook(() => {
      const online = useOnline();
      useRetryOnReconnect(online ? "server" : "offline", retry);
    });
    await goOffline();
    await goOnline();
    expect(retry).toHaveBeenCalledTimes(1);
  });
});

// apps/mobile/test/screens/player/useReduceMotion.test.tsx
//
// Tests for the reduce motion hook.
//
// Tested:
// - useReduceMotion
//
// What is covered:
// - false until the system answers, then its answer; following a change; unsubscribing on unmount
// - a failed read logged through the log port, leaving motion on
//
// Run with: pnpm --filter @beatly/mobile test -- useReduceMotion
//
// SEE: apps/mobile/src/screens/player/useReduceMotion.ts

import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { AccessibilityInfo } from "react-native";

import { useReduceMotion } from "../../../src/screens/player/useReduceMotion.ts";
import { makeCore, Wrapper } from "../../helpers/core.tsx";

const read = jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled");
const listen = jest.spyOn(AccessibilityInfo, "addEventListener");

afterEach(() => {
  read.mockReset().mockResolvedValue(false);
  listen.mockClear();
});

function hasRemove(value: unknown): value is { remove: () => void } {
  return typeof value === "object" && value !== null && "remove" in value;
}

function setup() {
  const ctx = makeCore();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Wrapper core={ctx.core}>{children}</Wrapper>
  );
  return { ctx, wrapper };
}

describe("useReduceMotion", () => {
  it("is false until the system answers, then follows it", async () => {
    let answer: (value: boolean) => void = () => undefined;
    read.mockReturnValue(
      new Promise<boolean>((resolve) => {
        answer = resolve;
      }),
    );
    const { wrapper } = setup();
    const { result } = await renderHook(() => useReduceMotion(), { wrapper });
    expect(result.current).toBe(false);
    await act(() => {
      answer(true);
    });
    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it("follows the setting when it changes", async () => {
    const { wrapper } = setup();
    const { result } = await renderHook(() => useReduceMotion(), { wrapper });
    const handler: unknown = listen.mock.calls[0]?.[1];
    if (typeof handler !== "function") throw new Error("no listener");
    await act(() => {
      (handler as (value: boolean) => void)(true);
    });
    expect(result.current).toBe(true);
  });

  it("stops listening on unmount", async () => {
    const { wrapper } = setup();
    const { unmount } = await renderHook(() => useReduceMotion(), { wrapper });
    const subscription: unknown = listen.mock.results[0]?.value;
    if (!hasRemove(subscription)) throw new Error("no subscription");
    const remove = jest.spyOn(subscription, "remove");
    await unmount();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("logs a failed read and leaves motion on", async () => {
    read.mockRejectedValue(new Error("boom"));
    const { ctx, wrapper } = setup();
    const { result } = await renderHook(() => useReduceMotion(), { wrapper });
    await waitFor(() => {
      expect(ctx.log.warn).toHaveBeenCalledWith("reduceMotion.failed", {
        message: "Error: boom",
      });
    });
    expect(result.current).toBe(false);
  });
});

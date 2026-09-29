// apps/mobile/test/screens/search/useDebouncedValue.test.tsx
//
// Tests for the debounce hook.
//
// Tested:
// - useDebouncedValue
//
// What is covered:
// - the old value before the delay, a restart on a second change, the last value after the delay
//
// Run with: pnpm --filter @beatly/mobile test -- useDebouncedValue
//
// SEE: apps/mobile/src/screens/search/useDebouncedValue.ts

import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook } from "@testing-library/react-native";

import { useDebouncedValue } from "../../../src/screens/search/useDebouncedValue.ts";

afterEach(() => {
  jest.useRealTimers();
});

describe("useDebouncedValue", () => {
  it("keeps the old value before the delay and lands the last one after it", async () => {
    jest.useFakeTimers();
    const { result, rerender } = await renderHook(
      (props: { value: string }) => useDebouncedValue(props.value, 300),
      { initialProps: { value: "a" } },
    );
    await rerender({ value: "b" });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(299);
    });
    expect(result.current).toBe("a");
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1);
    });
    expect(result.current).toBe("b");
  });

  it("restarts the delay on a second change", async () => {
    jest.useFakeTimers();
    const { result, rerender } = await renderHook(
      (props: { value: string }) => useDebouncedValue(props.value, 300),
      { initialProps: { value: "a" } },
    );
    await rerender({ value: "b" });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(200);
    });
    await rerender({ value: "c" });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(200);
    });
    expect(result.current).toBe("a");
    await act(async () => {
      await jest.advanceTimersByTimeAsync(100);
    });
    expect(result.current).toBe("c");
  });
});

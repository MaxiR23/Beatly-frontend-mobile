// apps/mobile/test/screens/trackMenu/useSheetPresence.test.tsx
//
// Tests for the sheet presence hook.
//
// Tested:
// - useSheetPresence
//
// What is covered:
// - show from nothing, hide keeping the sheet drawn until closed drops it
// - show while one is shown or closing closes it and opens the new one only after closed
// - hide after a queued show drops the queue, hide with nothing shown is a no-op
//
// Run with: pnpm --filter @beatly/mobile test -- useSheetPresence
//
// SEE: apps/mobile/src/screens/trackMenu/useSheetPresence.ts

import { describe, expect, it } from "@jest/globals";
import { act, renderHook } from "@testing-library/react-native";

import { useSheetPresence } from "../../../src/screens/trackMenu/useSheetPresence.ts";

const setup = () => renderHook(() => useSheetPresence<string>());

describe("useSheetPresence", () => {
  it("shows a sheet at once when nothing is drawn", async () => {
    const { result } = await setup();
    await act(() => {
      result.current.show("a");
    });
    expect(result.current.current).toBe("a");
    expect(result.current.visible).toBe(true);
  });

  it("keeps the sheet drawn when hidden, and drops it once closed", async () => {
    const { result } = await setup();
    await act(() => {
      result.current.show("a");
    });
    await act(() => {
      result.current.hide();
    });
    expect(result.current.current).toBe("a");
    expect(result.current.visible).toBe(false);
    await act(() => {
      result.current.closed();
    });
    expect(result.current.current).toBeNull();
  });

  it("closes the sheet on screen and opens the new one only after closed", async () => {
    const { result } = await setup();
    await act(() => {
      result.current.show("a");
    });
    await act(() => {
      result.current.show("b");
    });
    expect(result.current.current).toBe("a");
    expect(result.current.visible).toBe(false);
    await act(() => {
      result.current.closed();
    });
    expect(result.current.current).toBe("b");
    expect(result.current.visible).toBe(true);
  });

  it("waits for the close that is under way when another is shown", async () => {
    const { result } = await setup();
    await act(() => {
      result.current.show("a");
    });
    await act(() => {
      result.current.hide();
    });
    await act(() => {
      result.current.show("b");
    });
    expect(result.current.current).toBe("a");
    expect(result.current.visible).toBe(false);
    await act(() => {
      result.current.closed();
    });
    expect(result.current.current).toBe("b");
  });

  it("drops the queued sheet when hidden after a show", async () => {
    const { result } = await setup();
    await act(() => {
      result.current.show("a");
    });
    await act(() => {
      result.current.show("b");
    });
    await act(() => {
      result.current.hide();
    });
    await act(() => {
      result.current.closed();
    });
    expect(result.current.current).toBeNull();
    expect(result.current.visible).toBe(false);
  });

  it("does nothing when hidden with nothing shown", async () => {
    const { result } = await setup();
    await act(() => {
      result.current.hide();
    });
    expect(result.current.current).toBeNull();
    expect(result.current.visible).toBe(false);
  });
});

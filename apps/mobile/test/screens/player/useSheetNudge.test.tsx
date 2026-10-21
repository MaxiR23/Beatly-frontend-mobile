// apps/mobile/test/screens/player/useSheetNudge.test.tsx
//
// Tests for the sheet nudge hook.
//
// Tested:
// - useSheetNudge
//
// What is covered:
// - the first opening on a track nudging, a second opening on it not, an opening on another track nudging, no track yet then a track, a track change after the decision not asking again
// - Not applicable: the cache time from Cache-Control, because it reads an in-memory service with no header
//
// Run with: pnpm --filter @beatly/mobile test -- useSheetNudge
//
// SEE: apps/mobile/src/screens/player/useSheetNudge.ts

import { describe, expect, it } from "@jest/globals";
import { renderHook } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { useSheetNudge } from "../../../src/screens/player/useSheetNudge.ts";
import { makeCore, Wrapper } from "../../helpers/core.tsx";

function setup() {
  const { core } = makeCore();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Wrapper core={core}>{children}</Wrapper>
  );
  return { wrapper };
}

describe("useSheetNudge", () => {
  it("nudges the first opening on a track", async () => {
    const { wrapper } = setup();
    const { result } = await renderHook(() => useSheetNudge("t1"), { wrapper });
    expect(result.current).toBe(true);
  });

  it("does not nudge a second opening on the same track", async () => {
    const { wrapper } = setup();
    const first = await renderHook(() => useSheetNudge("t1"), { wrapper });
    await first.unmount();
    const second = await renderHook(() => useSheetNudge("t1"), { wrapper });
    expect(second.result.current).toBe(false);
  });

  it("nudges an opening on another track", async () => {
    const { wrapper } = setup();
    const first = await renderHook(() => useSheetNudge("t1"), { wrapper });
    await first.unmount();
    const second = await renderHook(() => useSheetNudge("t2"), { wrapper });
    expect(second.result.current).toBe(true);
  });

  it("waits for the track when the player opens before it", async () => {
    const { wrapper } = setup();
    const { result, rerender } = await renderHook(
      ({ id }: { id: string | null }) => useSheetNudge(id),
      { wrapper, initialProps: { id: null as string | null } },
    );
    expect(result.current).toBe(false);
    await rerender({ id: "t1" });
    expect(result.current).toBe(true);
  });

  it("does not ask again when the track changes while open", async () => {
    const { wrapper } = setup();
    const { result, rerender, unmount } = await renderHook(
      ({ id }: { id: string }) => useSheetNudge(id),
      { wrapper, initialProps: { id: "t1" } },
    );
    expect(result.current).toBe(true);
    await rerender({ id: "t2" });
    expect(result.current).toBe(true);
    await unmount();
    const later = await renderHook(() => useSheetNudge("t2"), { wrapper });
    expect(later.result.current).toBe(true);
  });
});

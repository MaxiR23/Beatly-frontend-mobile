// apps/mobile/test/screens/detail/useDominantColor.test.tsx
//
// Tests for the dominant color hook.
//
// Tested:
// - useDominantColor
//
// What is covered:
// - null, then the color; null when unavailable; a failed outcome logged through the log port; null for a null url without calling the adapter
//
// Run with: pnpm --filter @beatly/mobile test -- useDominantColor
//
// SEE: apps/mobile/src/screens/detail/useDominantColor.ts

import type { DominantColor } from "../../../src/adapters/imageColors.ts";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { useDominantColor } from "../../../src/screens/detail/useDominantColor.ts";
import { makeCore, Wrapper } from "../../helpers/core.tsx";

const mockGet = jest.fn<(url: string) => Promise<DominantColor>>();
const mockPeek = jest.fn<(url: string) => DominantColor | undefined>();
jest.mock("../../../src/adapters/imageColors.ts", () => ({
  getDominantColor: (url: string) => mockGet(url),
  peekDominantColor: (url: string) => mockPeek(url),
}));

beforeEach(() => {
  mockGet.mockReset();
  mockPeek.mockReset();
  mockPeek.mockReturnValue(undefined);
});

function setup() {
  const ctx = makeCore();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Wrapper core={ctx.core}>{children}</Wrapper>
  );
  return { ctx, wrapper };
}

describe("useDominantColor", () => {
  it("returns null, then the color", async () => {
    let resolve: (value: DominantColor) => void = () => undefined;
    mockGet.mockReturnValue(
      new Promise<DominantColor>((done) => {
        resolve = done;
      }),
    );
    const { wrapper } = setup();
    const { result } = await renderHook(() => useDominantColor("test://img/1"), { wrapper });
    expect(result.current).toBeNull();
    await act(async () => {
      resolve({ kind: "color", value: "#123456" });
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(result.current).toBe("#123456");
    });
  });

  it("returns a cached color at once", async () => {
    mockPeek.mockReturnValue({ kind: "color", value: "#654321" });
    const { wrapper } = setup();
    const { result } = await renderHook(() => useDominantColor("test://img/1"), { wrapper });
    expect(result.current).toBe("#654321");
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("stays null when unavailable", async () => {
    mockGet.mockResolvedValue({ kind: "unavailable" });
    const { ctx, wrapper } = setup();
    const { result } = await renderHook(() => useDominantColor("test://img/1"), { wrapper });
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledTimes(1);
    });
    expect(result.current).toBeNull();
    expect(ctx.log.warn).not.toHaveBeenCalled();
  });

  it("logs a failed outcome through the log port and stays null", async () => {
    mockGet.mockResolvedValue({ kind: "failed", message: "boom" });
    const { ctx, wrapper } = setup();
    const { result } = await renderHook(() => useDominantColor("test://img/1"), { wrapper });
    await waitFor(() => {
      expect(ctx.log.warn).toHaveBeenCalledWith("imageColors.failed", { message: "boom" });
    });
    expect(result.current).toBeNull();
  });

  it("returns null for a null url without calling the adapter", async () => {
    const { wrapper } = setup();
    const { result } = await renderHook(() => useDominantColor(null), { wrapper });
    expect(result.current).toBeNull();
    expect(mockGet).not.toHaveBeenCalled();
  });
});

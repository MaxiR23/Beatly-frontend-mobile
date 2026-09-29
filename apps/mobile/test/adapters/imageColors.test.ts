// apps/mobile/test/adapters/imageColors.test.ts
//
// Tests for the image colors adapter.
//
// Tested:
// - getDominantColor, peekDominantColor
//
// What is covered:
// - unavailable without loading the library when the native module is missing
// - the dominant color on android and the background color on ios
// - one library call per url in a session, a failed outcome that is retried on the next call
//
// Run with: pnpm --filter @beatly/mobile test -- adapters/imageColors
//
// SEE: apps/mobile/src/adapters/imageColors.ts

import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type * as AdapterModule from "../../src/adapters/imageColors.ts";

type Adapter = typeof AdapterModule;

const getColors = jest.fn<(url: string, config: object) => Promise<object>>();
let nativeModule: object | null = {};

function load(): Adapter {
  jest.resetModules();
  jest.doMock("expo", () => ({ requireOptionalNativeModule: () => nativeModule }));
  jest.doMock("react-native-image-colors", () => ({ getColors }));
  return jest.requireActual<Adapter>("../../src/adapters/imageColors.ts");
}

beforeEach(() => {
  getColors.mockReset();
  nativeModule = {};
});

describe("getDominantColor", () => {
  it("resolves unavailable without loading the library when the native module is missing", async () => {
    nativeModule = null;
    const { getDominantColor, peekDominantColor } = load();
    expect(await getDominantColor("test://img/1")).toEqual({ kind: "unavailable" });
    expect(getColors).not.toHaveBeenCalled();
    expect(peekDominantColor("test://img/1")).toEqual({ kind: "unavailable" });
  });

  it("returns the dominant color on android and the background color on ios", async () => {
    const { getDominantColor } = load();
    getColors.mockResolvedValueOnce({ platform: "android", dominant: "#111111" });
    getColors.mockResolvedValueOnce({ platform: "ios", background: "#222222" });
    expect(await getDominantColor("test://img/a")).toEqual({ kind: "color", value: "#111111" });
    expect(await getDominantColor("test://img/b")).toEqual({ kind: "color", value: "#222222" });
  });

  it("calls the library once per url in a session", async () => {
    const { getDominantColor, peekDominantColor } = load();
    getColors.mockResolvedValue({ platform: "android", dominant: "#111111" });
    expect(peekDominantColor("test://img/a")).toBeUndefined();
    await Promise.all([getDominantColor("test://img/a"), getDominantColor("test://img/a")]);
    await getDominantColor("test://img/a");
    expect(getColors).toHaveBeenCalledTimes(1);
    expect(peekDominantColor("test://img/a")).toEqual({ kind: "color", value: "#111111" });
  });

  it("returns a failed outcome when the library rejects, and retries that url next time", async () => {
    const { getDominantColor, peekDominantColor } = load();
    getColors.mockRejectedValueOnce(new Error("boom"));
    expect(await getDominantColor("test://img/a")).toEqual({ kind: "failed", message: "boom" });
    expect(peekDominantColor("test://img/a")).toBeUndefined();
    getColors.mockResolvedValueOnce({ platform: "android", dominant: "#333333" });
    expect(await getDominantColor("test://img/a")).toEqual({ kind: "color", value: "#333333" });
    expect(getColors).toHaveBeenCalledTimes(2);
  });
});

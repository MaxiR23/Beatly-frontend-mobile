// apps/mobile/test/adapters/device.test.ts
//
// Tests for the device adapter.
//
// Tested:
// - readDevice
//
// What is covered:
// - the app's config version, never the native app version (Expo Go's own)
// - unknown when the config has no version
// - the iOS version string and the Android release, not the API level
//
// Run with: pnpm --filter @beatly/mobile test -- adapters/device
//
// SEE: apps/mobile/src/adapters/device.ts

import { describe, expect, it, jest } from "@jest/globals";

import type * as AdapterModule from "../../src/adapters/device.ts";

type Adapter = typeof AdapterModule;

interface FakePlatform {
  readonly OS: "ios" | "android";
  readonly Version: string | number;
  readonly constants?: { readonly Release: string };
}

function load(expoConfig: { version?: string } | null, platform: FakePlatform): Adapter {
  jest.resetModules();
  jest.doMock("expo-constants", () => ({
    __esModule: true,
    default: { expoConfig, nativeAppVersion: "2.20.0" },
  }));
  jest.doMock("react-native", () => ({ Platform: platform }));
  return jest.requireActual<Adapter>("../../src/adapters/device.ts");
}

const ios: FakePlatform = { OS: "ios", Version: "18.1" };

describe("readDevice", () => {
  it("reads the app's config version, not the native app version", () => {
    expect(load({ version: "0.6.0" }, ios).readDevice().appVersion).toBe("0.6.0");
  });

  it("falls back to unknown when the config has no version", () => {
    expect(load({}, ios).readDevice().appVersion).toBe("unknown");
    expect(load(null, ios).readDevice().appVersion).toBe("unknown");
  });

  it("reads the iOS version string on iOS", () => {
    expect(load({ version: "0.6.0" }, ios).readDevice()).toEqual({
      platform: "ios",
      osVersion: "18.1",
      appVersion: "0.6.0",
    });
  });

  it("reads the Android release, not the API level", () => {
    const android: FakePlatform = { OS: "android", Version: 34, constants: { Release: "14" } };
    expect(load({ version: "0.6.0" }, android).readDevice()).toEqual({
      platform: "android",
      osVersion: "14",
      appVersion: "0.6.0",
    });
  });
});

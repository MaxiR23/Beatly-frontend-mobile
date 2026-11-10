// apps/mobile/test/appConfig.test.ts
//
// Tests the native identifiers of the Expo app config.
//
// Tested:
// - ios.bundleIdentifier and android.package are set
// - Both are the same value
// - The expo-audio plugin enables background playback without the microphone
//
// What is covered:
// - A native build needs both identifiers; a dynamic config cannot have
//   them written by Expo
//
// Run with: pnpm --filter @beatly/mobile test -- appConfig
//
// SEE: apps/mobile/app.config.ts

import { describe, expect, it } from "@jest/globals";

import config from "../app.config";

describe("app config plugins", () => {
  it("enables background playback without the microphone", () => {
    const entry = config.plugins?.find(
      (plugin) => Array.isArray(plugin) && plugin[0] === "expo-audio",
    );
    expect(Array.isArray(entry) ? entry[1] : undefined).toEqual({
      enableBackgroundPlayback: true,
      microphonePermission: false,
      recordAudioAndroid: false,
    });
  });
});

describe("app config identifiers", () => {
  it("sets the iOS bundle identifier and the Android package", () => {
    expect(config.ios?.bundleIdentifier).toBe("com.maxirebolo.beatly");
    expect(config.android?.package).toBe("com.maxirebolo.beatly");
  });

  it("uses the same value on both platforms", () => {
    expect(config.ios?.bundleIdentifier).toBeTruthy();
    expect(config.ios?.bundleIdentifier).toBe(config.android?.package);
  });
});

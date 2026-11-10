// apps/mobile/test/appConfig.test.ts
//
// Tests the native identifiers of the Expo app config.
//
// Tested:
// - ios.bundleIdentifier and android.package are set
// - Both are the same value
// - ios.appleTeamId follows APPLE_TEAM_ID and is omitted when it is unset or empty
// - The expo-audio plugin enables background playback without the microphone
//
// What is covered:
// - A native build needs both identifiers; a dynamic config cannot have
//   them written by Expo
//
// Run with: pnpm --filter @beatly/mobile test -- appConfig
//
// SEE: apps/mobile/app.config.ts

import { afterEach, describe, expect, it, jest } from "@jest/globals";

import type { ExpoConfig } from "expo/config";

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

describe("app config signing team", () => {
  const original = process.env.APPLE_TEAM_ID;

  afterEach(() => {
    if (original === undefined) delete process.env.APPLE_TEAM_ID;
    else process.env.APPLE_TEAM_ID = original;
  });

  // The config reads the variable when its module is evaluated, so each case loads a fresh copy.
  function evaluate(): ExpoConfig {
    let evaluated: ExpoConfig | undefined;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- isolateModules only isolates require
      evaluated = (require("../app.config") as { default: ExpoConfig }).default;
    });
    if (!evaluated) throw new Error("app config did not load");
    return evaluated;
  }

  it("sets ios.appleTeamId from APPLE_TEAM_ID", () => {
    process.env.APPLE_TEAM_ID = "TEAM123456";
    const evaluated = evaluate();
    expect(evaluated.ios?.appleTeamId).toBe("TEAM123456");
  });

  it("omits ios.appleTeamId when APPLE_TEAM_ID is unset", () => {
    delete process.env.APPLE_TEAM_ID;
    const evaluated = evaluate();
    expect(evaluated.ios).toBeDefined();
    expect(evaluated.ios).not.toHaveProperty("appleTeamId");
  });

  it("omits ios.appleTeamId when APPLE_TEAM_ID is empty", () => {
    process.env.APPLE_TEAM_ID = "";
    const evaluated = evaluate();
    expect(evaluated.ios).not.toHaveProperty("appleTeamId");
  });
});

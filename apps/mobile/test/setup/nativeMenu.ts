// apps/mobile/test/setup/nativeMenu.ts
//
// Test setup: reports the ExpoUI native module as missing, so every route and screen test takes the sheet fallback of the track menu instead of the iOS system menu.
//
// Tested:
// - Not a test itself; loaded by the jest `setupFiles` of apps/mobile
//
// What is covered:
// apps/mobile/test
//
import { jest } from "@jest/globals";
import type * as Expo from "expo";

// jest-expo mocks an ExpoUI module, so without this every test would take the native branch.
jest.mock("expo", () => {
  const actual = jest.requireActual<typeof Expo>("expo");
  return {
    ...actual,
    requireOptionalNativeModule: (name: string) =>
      name === "ExpoUI" ? null : actual.requireOptionalNativeModule<object>(name),
  };
});

// packages/ui/test/components/platform.test.ts
//
// Tests for the Android-variant helper.
//
// Tested:
// - isAndroidVariant
//
// What is covered:
// - true on Android, false on iOS, read on every call (a later switch of Platform.OS is seen)
//
// Run with: pnpm --filter @beatly/ui test -- platform
//
// SEE: packages/ui/src/components/platform.ts

import { afterEach, describe, expect, it } from "@jest/globals";
import { Platform } from "react-native";

import { isAndroidVariant } from "../../src/components/platform.ts";

afterEach(() => {
  Platform.OS = "ios";
});

describe("isAndroidVariant", () => {
  it("is false on iOS", () => {
    Platform.OS = "ios";
    expect(isAndroidVariant()).toBe(false);
  });

  it("is true on Android", () => {
    Platform.OS = "android";
    expect(isAndroidVariant()).toBe(true);
  });

  it("follows a switch of the platform between calls", () => {
    Platform.OS = "ios";
    expect(isAndroidVariant()).toBe(false);
    Platform.OS = "android";
    expect(isAndroidVariant()).toBe(true);
  });
});

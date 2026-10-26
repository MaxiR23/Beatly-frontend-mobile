// packages/ui/test/components/pressFeedback.test.ts
//
// Tests for the shared press feedback.
//
// Tested:
// - pressFeedback
//
// What is covered:
// - iOS: no ripple, the pressed control fades to motion.pressOpacity
// - Android: a foreground ripple in the token color for the surface and for the accent, never an opacity, the clip bounds or round
// - the platform is read on every call
//
// Run with: pnpm --filter @beatly/ui test -- pressFeedback
//
// SEE: packages/ui/src/components/pressFeedback.ts

import { afterEach, describe, expect, it } from "@jest/globals";
import { Platform } from "react-native";

import { pressFeedback } from "../../src/components/pressFeedback.ts";
import { color } from "../../src/tokens/color.ts";
import { motion } from "../../src/tokens/motion.ts";
import { radius } from "../../src/tokens/radius.ts";

afterEach(() => {
  Platform.OS = "ios";
});

const options = [
  { on: "surface", shape: "bounds" },
  { on: "surface", shape: "round" },
  { on: "accent", shape: "bounds" },
  { on: "accent", shape: "round" },
] as const;

describe("pressFeedback on iOS", () => {
  it.each(options)("has no ripple and fades while pressed ($on, $shape)", (option) => {
    Platform.OS = "ios";
    const press = pressFeedback(option);
    expect(press.android_ripple).toBeNull();
    expect(press.style(true)).toEqual({ opacity: motion.pressOpacity });
    expect(press.style(false)).toBeNull();
  });
});

describe("pressFeedback on Android", () => {
  it("ripples in color.overlay.ripple over the content", () => {
    Platform.OS = "android";
    expect(pressFeedback({ on: "surface" }).android_ripple).toEqual({
      color: color.overlay.ripple,
      foreground: true,
    });
    expect(pressFeedback().android_ripple).toEqual({
      color: color.overlay.ripple,
      foreground: true,
    });
  });

  it("ripples in color.overlay.rippleOnAccent on the accent", () => {
    Platform.OS = "android";
    expect(pressFeedback({ on: "accent" }).android_ripple).toEqual({
      color: color.overlay.rippleOnAccent,
      foreground: true,
    });
  });

  it.each(options)("never changes the opacity ($on, $shape)", (option) => {
    Platform.OS = "android";
    const press = pressFeedback(option);
    expect(press.style(true)).toEqual(press.style(false));
    expect(press.style(true)).not.toHaveProperty("opacity");
  });

  it("bounds clips to the pressable's own corners", () => {
    Platform.OS = "android";
    const style = pressFeedback({ shape: "bounds" }).style(true);
    expect(style).toEqual({ overflow: "hidden" });
    expect(style).not.toHaveProperty("borderRadius");
  });

  it("round clips to radius.full", () => {
    Platform.OS = "android";
    expect(pressFeedback({ shape: "round" }).style(false)).toEqual({
      overflow: "hidden",
      borderRadius: radius.full,
    });
  });

  it("follows a switch of the platform between calls", () => {
    Platform.OS = "ios";
    expect(pressFeedback().android_ripple).toBeNull();
    Platform.OS = "android";
    expect(pressFeedback().android_ripple).not.toBeNull();
  });
});

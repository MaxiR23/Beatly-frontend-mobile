// apps/mobile/test/setup/glass.ts
//
// Test setup: fakes expo-glass-effect at the module so every route test takes the solid fallback branch.
//
// Tested:
// - Not a test itself; loaded by the jest `setupFiles` of apps/mobile
//
// What is covered:
// apps/mobile/test
//
import { jest } from "@jest/globals";

interface ReactNativeView {
  View: unknown;
}

jest.mock("expo-glass-effect", () => {
  const { View } = jest.requireActual<ReactNativeView>("react-native");
  return {
    GlassView: View,
    isLiquidGlassAvailable: () => false,
    isGlassEffectAPIAvailable: () => false,
  };
});

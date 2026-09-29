// packages/ui/test/components/GlassSurface.test.tsx
//
// Tests for the GlassSurface.
//
// Tested:
// - GlassSurface
// - isGlassAvailable
//
// What is covered:
// - the solid fallback when glass is unavailable, the glass view when it is, the availability test
//
// Run with: pnpm --filter @beatly/ui test -- GlassSurface
//
// SEE: packages/ui/src/components/GlassSurface.tsx

import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import { Platform, Text } from "react-native";

import { GlassSurface, isGlassAvailable } from "../../src/components/GlassSurface.tsx";
import { color } from "../../src/tokens/color.ts";

interface ReactNativeView {
  View: unknown;
}

const mockGlass = { available: false };
jest.mock("expo-glass-effect", () => {
  const { View } = jest.requireActual<ReactNativeView>("react-native");
  return {
    GlassView: View,
    isLiquidGlassAvailable: () => mockGlass.available,
    isGlassEffectAPIAvailable: () => mockGlass.available,
  };
});

afterEach(() => {
  mockGlass.available = false;
  Platform.OS = "ios";
});

describe("GlassSurface", () => {
  it("draws the solid fallback when glass is unavailable", async () => {
    await render(
      <GlassSurface variant="bar" testID="surface">
        <Text>inside</Text>
      </GlassSurface>,
    );
    expect(screen.getByText("inside")).toBeTruthy();
    expect(screen.getByTestId("surface")).toHaveStyle({
      backgroundColor: color.surface.raised,
      borderColor: color.surface.border,
    });
  });

  it("draws the glass view without the fallback background when glass is available", async () => {
    mockGlass.available = true;
    await render(
      <GlassSurface variant="sheet" testID="surface">
        <Text>inside</Text>
      </GlassSurface>,
    );
    expect(screen.getByText("inside")).toBeTruthy();
    expect(screen.getByTestId("surface")).not.toHaveStyle({
      backgroundColor: color.surface.raised,
    });
  });

  it("reports glass only on iOS when the library says it is available", () => {
    expect(isGlassAvailable()).toBe(false);
    mockGlass.available = true;
    expect(isGlassAvailable()).toBe(true);
    Platform.OS = "android";
    expect(isGlassAvailable()).toBe(false);
  });
});

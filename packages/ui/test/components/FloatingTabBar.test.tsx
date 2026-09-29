// packages/ui/test/components/FloatingTabBar.test.tsx
//
// Tests for the FloatingTabBar.
//
// Tested:
// - FloatingTabBar
// - floatingTabBarClearance
//
// What is covered:
// - icon-only tabs with roles and labels, the selected one, the press, the clearance formula
//
// Run with: pnpm --filter @beatly/ui test -- FloatingTabBar
//
// SEE: packages/ui/src/components/FloatingTabBar.tsx

import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { FloatingTabBar, floatingTabBarClearance } from "../../src/components/FloatingTabBar.tsx";
import { color } from "../../src/tokens/color.ts";
import { layout, spacing } from "../../src/tokens/spacing.ts";

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

function makeTabs(onPress = jest.fn()) {
  return [
    { key: "a", icon: "house", label: "Home", selected: true, onPress },
    { key: "b", icon: "search", label: "Search", selected: false, onPress: jest.fn() },
  ] as const;
}

describe("FloatingTabBar", () => {
  it("draws each tab as an icon-only tab with its label", async () => {
    await render(<FloatingTabBar tabs={makeTabs()} bottomInset={0} />);
    expect(screen.getByRole("tab", { name: "Home" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Search" })).toBeTruthy();
    expect(screen.queryByText("Home")).toBeNull();
  });

  it("marks only the selected tab, with the muted background", async () => {
    await render(<FloatingTabBar tabs={makeTabs()} bottomInset={0} />);
    const home = screen.getByRole("tab", { name: "Home" });
    const search = screen.getByRole("tab", { name: "Search" });
    expect(home.props.accessibilityState).toMatchObject({ selected: true });
    expect(search.props.accessibilityState).toMatchObject({ selected: false });
    expect(home).toHaveStyle({ backgroundColor: color.overlay.muted });
    expect(search).not.toHaveStyle({ backgroundColor: color.overlay.muted });
  });

  it("calls the onPress of the pressed tab", async () => {
    const onPress = jest.fn();
    await render(<FloatingTabBar tabs={makeTabs(onPress)} bottomInset={0} />);
    await fireEvent.press(screen.getByRole("tab", { name: "Home" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe("floatingTabBarClearance", () => {
  it("adds the bar offset, its height and one section gap to the inset", () => {
    expect(floatingTabBarClearance(10)).toBe(
      10 + spacing.sm + layout.controlHeight + 2 * spacing.xs + spacing.xl,
    );
  });
});

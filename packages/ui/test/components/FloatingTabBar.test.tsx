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
// - the accessory and the pill at the same width, the window width minus the gutter on each side; the tabs
//   sharing it evenly at the control height; the accessory's md gap
//
// Run with: pnpm --filter @beatly/ui test -- FloatingTabBar
//
// SEE: packages/ui/src/components/FloatingTabBar.tsx

import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Dimensions, Text } from "react-native";

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

describe("accessory", () => {
  it("draws the accessory above the tabs at the window width minus the gutters", async () => {
    await render(
      <FloatingTabBar tabs={makeTabs()} bottomInset={0} accessory={<Text>mini</Text>} />,
    );
    expect(screen.getByText("mini")).toBeTruthy();
    expect(screen.getByTestId("tab-accessory")).toHaveStyle({
      width: Dimensions.get("window").width - 2 * layout.gutter,
      marginBottom: spacing.md,
    });
  });

  it("draws the pill at the accessory's width, the tabs sharing it evenly", async () => {
    await render(
      <FloatingTabBar tabs={makeTabs()} bottomInset={10} accessory={<Text>mini</Text>} />,
    );
    const barWidth = Dimensions.get("window").width - 2 * layout.gutter;
    expect(screen.getByTestId("tab-pill")).toHaveStyle({ width: barWidth });
    expect(screen.getByTestId("tab-accessory")).toHaveStyle({ width: barWidth });
    for (const name of ["Home", "Search"]) {
      expect(screen.getByRole("tab", { name })).toHaveStyle({
        flex: 1,
        height: layout.controlHeight,
      });
    }
    const outer = screen.getByTestId("tab-accessory").parent;
    expect(outer).toHaveStyle({ bottom: 10 + spacing.sm });
  });

  it("draws the pill at the window width minus the gutters without an accessory", async () => {
    await render(<FloatingTabBar tabs={makeTabs()} bottomInset={0} />);
    expect(screen.getByTestId("tab-pill")).toHaveStyle({
      width: Dimensions.get("window").width - 2 * layout.gutter,
    });
  });

  it("draws no accessory view without one", async () => {
    await render(<FloatingTabBar tabs={makeTabs()} bottomInset={0} />);
    expect(screen.queryByTestId("tab-accessory")).toBeNull();
  });
});

describe("floatingTabBarClearance", () => {
  it("adds the accessory's height and gap when there is one", () => {
    expect(floatingTabBarClearance(10, true)).toBe(
      floatingTabBarClearance(10) + layout.controlHeight + 2 * spacing.xs + spacing.md,
    );
  });

  it("adds the bar offset, its height and one section gap to the inset", () => {
    expect(floatingTabBarClearance(10)).toBe(
      10 + spacing.sm + layout.controlHeight + 2 * spacing.xs + spacing.xl,
    );
  });
});

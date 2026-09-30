// packages/ui/test/components/FloatingTabBar.test.tsx
//
// Tests for the FloatingTabBar.
//
// Tested:
// - FloatingTabBar
// - floatingTabBarClearance, floatingTabBarWidth
//
// What is covered:
// - icon-only tabs with roles and labels, the selected one, the press, the clearance formula
// - the width formula and the accessory drawn above the tabs at that width, with its md gap
//
// Run with: pnpm --filter @beatly/ui test -- FloatingTabBar
//
// SEE: packages/ui/src/components/FloatingTabBar.tsx

import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import {
  FloatingTabBar,
  floatingTabBarClearance,
  floatingTabBarWidth,
} from "../../src/components/FloatingTabBar.tsx";
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
  it("draws the accessory above the tabs inside a view of the pill's width", async () => {
    await render(
      <FloatingTabBar tabs={makeTabs()} bottomInset={0} accessory={<Text>mini</Text>} />,
    );
    expect(screen.getByText("mini")).toBeTruthy();
    expect(screen.getByTestId("tab-accessory")).toHaveStyle({
      width: floatingTabBarWidth(2),
      marginBottom: spacing.md,
    });
  });

  it("draws no accessory view without one", async () => {
    await render(<FloatingTabBar tabs={makeTabs()} bottomInset={0} />);
    expect(screen.queryByTestId("tab-accessory")).toBeNull();
  });
});

describe("floatingTabBarWidth", () => {
  it("adds the items, the gaps between them and the padding", () => {
    expect(floatingTabBarWidth(2)).toBe(2 * layout.tabItemWidth + spacing.xs + 2 * spacing.xs);
    expect(floatingTabBarWidth(4)).toBe(4 * layout.tabItemWidth + 3 * spacing.xs + 2 * spacing.xs);
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

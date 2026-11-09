// packages/ui/test/components/FloatingTabBar.test.tsx
//
// Tests for the FloatingTabBar.
//
// Tested:
// - FloatingTabBar
// - floatingTabBarClearance
// - dockedTabBarHeight
//
// What is covered:
// - icon-only tabs with roles and labels, the selected one, the press, the clearance formula
// - the accessory and the pill at the same width, the window width minus the gutter on each side; the tabs
//   sharing it evenly at the control height; the accessory's xs gap
// - on Android: the docked full-width block instead of the pill, icon and visible name per tab, the selected tab's
//   role and tone, Home filled only when selected, the fade and the opaque inset, the accessory's side inset and
//   gap, the block's height and the clearance from dockedTabBarHeight
//
// Run with: pnpm --filter @beatly/ui test -- FloatingTabBar
//
// SEE: packages/ui/src/components/FloatingTabBar.tsx

import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Dimensions, Platform, Text } from "react-native";

import {
  dockedTabBarHeight,
  FloatingTabBar,
  floatingTabBarClearance,
} from "../../src/components/FloatingTabBar.tsx";
import { color } from "../../src/tokens/color.ts";
import { icon } from "../../src/tokens/icon.ts";
import { layout, spacing } from "../../src/tokens/spacing.ts";
import { typography } from "../../src/tokens/typography.ts";
import { flatStyle } from "../helpers/flatStyle.ts";

interface JsonNode {
  props: Record<string, unknown>;
  children: unknown;
}

function isJsonNode(value: unknown): value is JsonNode {
  return typeof value === "object" && value !== null && "props" in value;
}

// Collects, from the rendered tree, every svg root (an icon glyph), in order.
function glyphs(tree: unknown): JsonNode[] {
  const found: JsonNode[] = [];
  const visit = (node: unknown) => {
    if (Array.isArray(node)) node.forEach(visit);
    if (!isJsonNode(node)) return;
    if ("xmlns" in node.props) found.push(node);
    visit(node.children);
  };
  visit(tree);
  return found;
}

afterEach(() => {
  Platform.OS = "ios";
});

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
      marginBottom: spacing.xs,
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
      floatingTabBarClearance(10) + layout.controlHeight + 2 * spacing.xs + spacing.xs,
    );
  });

  it("adds the bar offset, its height and one section gap to the inset", () => {
    expect(floatingTabBarClearance(10)).toBe(
      10 + spacing.sm + layout.controlHeight + 2 * spacing.xs + spacing.xl,
    );
  });
});

describe("Android docked bar", () => {
  beforeEach(() => {
    Platform.OS = "android";
  });

  it("docks a full-width block at the bottom edge instead of the pill", async () => {
    await render(<FloatingTabBar tabs={makeTabs()} bottomInset={0} />);
    expect(screen.queryByTestId("tab-pill")).toBeNull();
    expect(screen.getByTestId("tab-dock")).toHaveStyle({
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
    });
  });

  it("draws each tab with its icon and its visible name, sharing the width", async () => {
    await render(<FloatingTabBar tabs={makeTabs()} bottomInset={0} />);
    for (const name of ["Home", "Search"]) {
      expect(screen.getByText(name)).toBeTruthy();
      const tab = screen.getByRole("tab", { name });
      expect(tab).toHaveStyle({ flex: 1 });
      expect(flatStyle(tab.props.style).height).toBeGreaterThanOrEqual(layout.controlHeight);
    }
    expect(glyphs(screen.toJSON())).toHaveLength(2);
  });

  it("marks the selected tab in primary with the heavier role and the others in secondary", async () => {
    await render(<FloatingTabBar tabs={makeTabs()} bottomInset={0} />);
    expect(screen.getByRole("tab", { name: "Home" }).props.accessibilityState).toMatchObject({
      selected: true,
    });
    expect(screen.getByRole("tab", { name: "Search" }).props.accessibilityState).toMatchObject({
      selected: false,
    });
    expect(screen.getByText("Home")).toHaveStyle({
      ...typography.tabLabelSelected,
      color: color.text.primary,
    });
    expect(screen.getByText("Search")).toHaveStyle({
      ...typography.meta,
      color: color.text.secondary,
    });
    for (const name of ["Home", "Search"]) {
      expect(screen.getByRole("tab", { name })).not.toHaveStyle({
        backgroundColor: color.overlay.muted,
      });
    }
  });

  it("fills the glyph of a selected tab that has a filled form only", async () => {
    const onPress = jest.fn();
    const tabs = (selected: boolean, fill: boolean) =>
      [
        { key: "a", icon: "house", label: "Home", selected, fillWhenSelected: fill, onPress },
        {
          key: "b",
          icon: "search",
          label: "Search",
          selected: false,
          fillWhenSelected: false,
          onPress,
        },
      ] as const;
    const { rerender } = await render(<FloatingTabBar tabs={tabs(true, true)} bottomInset={0} />);
    expect(glyphs(screen.toJSON())[0]?.props.fill).toBe(color.text.primary);
    expect(glyphs(screen.toJSON())[1]?.props.fill).toBe("none");
    await rerender(<FloatingTabBar tabs={tabs(false, true)} bottomInset={0} />);
    expect(glyphs(screen.toJSON())[0]?.props.fill).toBe("none");
    await rerender(<FloatingTabBar tabs={tabs(true, false)} bottomInset={0} />);
    expect(glyphs(screen.toJSON())[0]?.props.fill).toBe("none");
  });

  it("draws the fade into the base surface and an opaque inset", async () => {
    await render(<FloatingTabBar tabs={makeTabs()} bottomInset={10} />);
    expect(screen.getByTestId("tab-dock-fade")).toHaveStyle({ bottom: 10 });
    expect(screen.getByTestId("tab-dock-inset")).toHaveStyle({
      height: 10,
      backgroundColor: color.surface.base,
    });
  });

  it("rests the accessory inside the block, spacing.sm from the sides and spacing.xs above the tabs", async () => {
    const { rerender } = await render(
      <FloatingTabBar tabs={makeTabs()} bottomInset={10} accessory={<Text>mini</Text>} />,
    );
    expect(screen.getByTestId("tab-accessory")).toHaveStyle({
      marginHorizontal: spacing.sm,
      marginBottom: spacing.xs,
    });
    await rerender(<FloatingTabBar tabs={makeTabs()} bottomInset={10} />);
    expect(screen.queryByTestId("tab-accessory")).toBeNull();
    expect(screen.getByTestId("tab-dock")).toBeTruthy();
    expect(screen.getByTestId("tab-dock-fade")).toBeTruthy();
  });

  it("sizes the block from dockedTabBarHeight", async () => {
    const { rerender } = await render(<FloatingTabBar tabs={makeTabs()} bottomInset={10} />);
    expect(screen.getByTestId("tab-dock")).toHaveStyle({ height: dockedTabBarHeight(10) });
    await rerender(
      <FloatingTabBar tabs={makeTabs()} bottomInset={10} accessory={<Text>mini</Text>} />,
    );
    expect(screen.getByTestId("tab-dock")).toHaveStyle({ height: dockedTabBarHeight(10, true) });
  });

  it("calls the onPress of the pressed tab", async () => {
    const onPress = jest.fn();
    await render(<FloatingTabBar tabs={makeTabs(onPress)} bottomInset={0} />);
    await fireEvent.press(screen.getByRole("tab", { name: "Home" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe("dockedTabBarHeight", () => {
  it("adds the fade zone, the tab row and the inset", () => {
    expect(dockedTabBarHeight(10)).toBe(
      spacing.xl +
        (spacing.sm +
          icon.size.lg +
          spacing.xs +
          typography.tabLabelSelected.lineHeight +
          spacing.sm) +
        10,
    );
  });

  it("adds the accessory and its gap", () => {
    expect(dockedTabBarHeight(10, true)).toBe(
      dockedTabBarHeight(10) + layout.controlHeight + 2 * spacing.xs + spacing.xs,
    );
  });

  it("is the clearance on Android", () => {
    Platform.OS = "android";
    expect(floatingTabBarClearance(10)).toBe(dockedTabBarHeight(10));
    expect(floatingTabBarClearance(10, true)).toBe(dockedTabBarHeight(10, true));
  });
});

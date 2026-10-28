// packages/ui/test/components/Notice.test.tsx
//
// Tests for the Notice.
//
// Tested:
// - Notice
//
// What is covered:
// - iOS floating: the check or the x, the meta line, the glass bar, no action drawn even when one is given
// - inline on both platforms: the icon row with no snackbar
// - Android floating: the inverse surface with extra-small corners, no icon, the message in the inverse body text, with and without an action, the action at the end running its callback
// - the alert role and polite live region on every variant
//
// Run with: pnpm --filter @beatly/ui test -- Notice.test
//
// SEE: packages/ui/src/components/Notice.tsx

import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Platform, type StyleProp, type TextStyle, type ViewStyle } from "react-native";

import { Notice } from "../../src/components/Notice.tsx";
import { color } from "../../src/tokens/color.ts";
import { radius } from "../../src/tokens/radius.ts";
import { spacing } from "../../src/tokens/spacing.ts";
import { typography } from "../../src/tokens/typography.ts";
import { flatStyle } from "../helpers/flatStyle.ts";

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

interface JsonNode {
  props: Record<string, unknown>;
  children: unknown;
}

function isJsonNode(value: unknown): value is JsonNode {
  return typeof value === "object" && value !== null && "props" in value;
}

function svgRoots(tree: unknown): JsonNode[] {
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

function iconClasses(): string[] {
  const [root] = svgRoots(screen.toJSON());
  return String(root?.props.className).split(/\s+/);
}

function styleOf(testID: string): ViewStyle {
  return flatStyle(screen.getByTestId(testID).props.style as StyleProp<ViewStyle>);
}

function treeHasBackground(value: string): boolean {
  return JSON.stringify(screen.toJSON()).includes(`"backgroundColor":"${value}"`);
}

afterEach(() => {
  Platform.OS = "ios";
});

describe("Notice on iOS", () => {
  it("draws the check, the meta line and the glass bar when floating", async () => {
    await render(<Notice tone="success" message="Saved" floating testID="n" />);
    expect(iconClasses()).toContain("lucide-check");
    expect(screen.getByText("Saved")).toBeTruthy();
    const node = screen.getByTestId("n");
    expect(node.props.accessibilityRole).toBe("alert");
    expect(node.props.accessibilityLiveRegion).toBe("polite");
    expect(treeHasBackground(color.surface.raised)).toBe(true);
    expect(JSON.stringify(screen.toJSON())).toContain(`"borderRadius":${String(radius.full)}`);
  });

  it("draws the x for an error", async () => {
    await render(<Notice tone="error" message="Failed" floating />);
    expect(iconClasses()).toContain("lucide-x");
  });

  it("does not draw an action", async () => {
    await render(
      <Notice
        tone="error"
        message="Failed"
        floating
        action={{ label: "Undo", onPress: jest.fn() }}
      />,
    );
    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
  });
});

describe("Notice inline", () => {
  it.each(["ios", "android"] as const)("keeps the icon row on %s", async (os) => {
    Platform.OS = os;
    await render(<Notice tone="error" message="Failed" testID="n" />);
    expect(iconClasses()).toContain("lucide-x");
    expect(treeHasBackground(color.surface.inverse)).toBe(false);
    expect(screen.getByTestId("n").props.accessibilityLiveRegion).toBe("polite");
  });
});

describe("Notice floating on Android", () => {
  it("draws the snackbar: inverse surface, extra-small corners, no icon", async () => {
    Platform.OS = "android";
    await render(<Notice tone="error" message="Failed" floating testID="n" />);
    const style = styleOf("n");
    expect(style.backgroundColor).toBe(color.surface.inverse);
    expect(style.borderRadius).toBe(radius.xs);
    expect(svgRoots(screen.toJSON())).toHaveLength(0);
    const text = flatStyle(screen.getByText("Failed").props.style as StyleProp<TextStyle>);
    expect(text.color).toBe(color.text.inverse);
    expect(text.fontSize).toBe(typography.body.fontSize);
    const node = screen.getByTestId("n");
    expect(node.props.accessibilityRole).toBe("alert");
    expect(node.props.accessibilityLiveRegion).toBe("polite");
  });

  it("draws no action when none is given", async () => {
    Platform.OS = "android";
    await render(<Notice tone="error" message="Failed" floating testID="n" />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(styleOf("n").paddingEnd).toBe(spacing.lg);
  });

  it("draws the action at the end and runs its callback on press", async () => {
    Platform.OS = "android";
    const onPress = jest.fn();
    await render(
      <Notice
        tone="error"
        message="Failed"
        floating
        testID="n"
        action={{ label: "Undo", onPress }}
      />,
    );
    const button = screen.getByRole("button", { name: "Undo" });
    const children = screen.getByTestId("n").children;
    expect(children).toHaveLength(2);
    expect(children[1]).toBe(button);
    expect(styleOf("n").paddingEnd).toBe(spacing.sm);
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

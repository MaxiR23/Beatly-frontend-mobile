// packages/ui/test/components/Chip.test.tsx
//
// Tests for the Chip.
//
// Tested:
// - Chip
//
// What is covered:
// - iOS: today's pill, selected on the accent with inverse text, unselected on the control fill, no check
// - Android: the Material 3 filter chip, 32 tall with 8 corners; unselected outlined with no fill and secondary text; selected on the muted fill with no outline, primary text and a leading check
// - Android: the foreground ripple in color.overlay.ripple in both states, clipped to the 8 corners
// - the selected accessibility state on both platforms, the press
//
// Run with: pnpm --filter @beatly/ui test -- Chip
//
// SEE: packages/ui/src/components/Chip.tsx

import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import {
  Platform,
  processColor,
  StyleSheet,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { Chip } from "../../src/components/Chip.tsx";
import { border } from "../../src/tokens/border.ts";
import { color } from "../../src/tokens/color.ts";
import { radius } from "../../src/tokens/radius.ts";
import { layout, spacing } from "../../src/tokens/spacing.ts";

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

function flat(node: { props: { style?: unknown } }): ViewStyle {
  return StyleSheet.flatten(node.props.style as StyleProp<ViewStyle>);
}

function labelColor(label: string): unknown {
  return StyleSheet.flatten(screen.getByText(label).props.style as StyleProp<TextStyle>).color;
}

afterEach(() => {
  Platform.OS = "ios";
});

describe("Chip on iOS", () => {
  it("is selected with the accent pill and inverse text", async () => {
    await render(<Chip label="Hits" selected onPress={jest.fn()} />);
    const chip = screen.getByRole("button", { name: "Hits" });
    expect(chip.props.accessibilityState).toEqual({ selected: true });
    const style = flat(chip);
    expect(style.backgroundColor).toBe(color.accent.primary);
    expect(style.height).toBe(layout.chipHeight);
    expect(style.borderRadius).toBe(radius.full);
    expect(style.paddingHorizontal).toBe(spacing.lg);
    expect(style).not.toHaveProperty("borderWidth");
    expect(labelColor("Hits")).toBe(color.text.inverse);
    expect(svgRoots(screen.toJSON())).toHaveLength(0);
  });

  it("is not selected with the control background", async () => {
    await render(<Chip label="Hits" selected={false} onPress={jest.fn()} />);
    const chip = screen.getByRole("button", { name: "Hits" });
    expect(chip.props.accessibilityState).toEqual({ selected: false });
    const style = flat(chip);
    expect(style.backgroundColor).toBe(color.surface.control);
    expect(style.height).toBe(layout.chipHeight);
    expect(style.borderRadius).toBe(radius.full);
    expect(style).not.toHaveProperty("borderWidth");
    expect(labelColor("Hits")).toBe(color.text.primary);
    expect(svgRoots(screen.toJSON())).toHaveLength(0);
  });

  it("calls onPress", async () => {
    const onPress = jest.fn();
    await render(<Chip label="Hits" selected={false} onPress={onPress} />);
    await fireEvent.press(screen.getByRole("button", { name: "Hits" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe("Chip on Android", () => {
  it("is 32 tall with 8 corners, outlined and unfilled when not selected", async () => {
    Platform.OS = "android";
    await render(<Chip label="Hits" selected={false} onPress={jest.fn()} />);
    const chip = screen.getByRole("button", { name: "Hits" });
    const style = flat(chip);
    expect(style.height).toBe(layout.chipHeightAndroid);
    expect(style.borderRadius).toBe(radius.sm);
    expect(style.borderWidth).toBe(border.width);
    expect(style.borderColor).toBe(color.surface.border);
    expect(style.backgroundColor).toBeUndefined();
    expect(labelColor("Hits")).toBe(color.text.secondary);
    expect(svgRoots(screen.toJSON())).toHaveLength(0);
    expect(chip.props.accessibilityState).toEqual({ selected: false });
  });

  it("takes the muted fill, no outline and a leading check when selected", async () => {
    Platform.OS = "android";
    await render(<Chip label="Hits" selected onPress={jest.fn()} />);
    const chip = screen.getByRole("button", { name: "Hits" });
    const style = flat(chip);
    expect(style.backgroundColor).toBe(color.overlay.muted);
    expect(style.borderWidth).toBeUndefined();
    expect(style.height).toBe(layout.chipHeightAndroid);
    expect(style.borderRadius).toBe(radius.sm);
    expect(style.paddingStart).toBe(spacing.sm);
    const svgs = svgRoots(screen.toJSON());
    expect(svgs).toHaveLength(1);
    expect(String(svgs[0]?.props.className).split(/\s+/)).toContain("lucide-check");
    const tree = screen.toJSON();
    const children = isJsonNode(tree) && Array.isArray(tree.children) ? tree.children : [];
    expect(children).toHaveLength(2);
    expect(JSON.stringify(children[0])).toContain("lucide-check");
    expect(JSON.stringify(children[1])).not.toContain("lucide-check");
    expect(labelColor("Hits")).toBe(color.text.primary);
    expect(chip.props.accessibilityState).toEqual({ selected: true });
  });

  it.each([true, false])(
    "ripples in color.overlay.ripple clipped to the 8 corners (selected: %s)",
    async (selected) => {
      Platform.OS = "android";
      await render(<Chip label="Hits" selected={selected} onPress={jest.fn()} />);
      const chip = screen.getByRole("button", { name: "Hits" });
      expect(chip.props.nativeForegroundAndroid).toMatchObject({
        type: "RippleAndroid",
        borderless: false,
        color: processColor(color.overlay.ripple),
      });
      expect(chip.props.nativeBackgroundAndroid).toBeUndefined();
      const style = flat(chip);
      expect(style.overflow).toBe("hidden");
      expect(style.borderRadius).toBe(radius.sm);
      expect(style).not.toHaveProperty("opacity");
    },
  );

  it("calls onPress", async () => {
    Platform.OS = "android";
    const onPress = jest.fn();
    await render(<Chip label="Hits" selected={false} onPress={onPress} />);
    await fireEvent.press(screen.getByRole("button", { name: "Hits" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

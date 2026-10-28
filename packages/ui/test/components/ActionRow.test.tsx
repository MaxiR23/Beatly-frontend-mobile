// packages/ui/test/components/ActionRow.test.tsx
//
// Tests for the ActionRow.
//
// Tested:
// - ActionRow
//
// What is covered:
// - iOS: control height row with the layout gap and an icon of icon.size.md
// - Android: the Material 3 list item, 56 tall, full width through the sheet padding bleed, 16 gap, a 22 icon
// - both platforms: the press, and the destructive label in the error tone
//
// Run with: pnpm --filter @beatly/ui test -- ActionRow
//
// SEE: packages/ui/src/components/ActionRow.tsx

import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Platform, StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from "react-native";

import { ActionRow } from "../../src/components/ActionRow.tsx";
import { color } from "../../src/tokens/color.ts";
import { icon } from "../../src/tokens/icon.ts";
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

function row(): ViewStyle {
  return StyleSheet.flatten(
    screen.getByRole("button", { name: "Share" }).props.style as StyleProp<ViewStyle>,
  );
}

afterEach(() => {
  Platform.OS = "ios";
});

describe("ActionRow", () => {
  it("on iOS is a control height row with the layout gap and the medium icon", async () => {
    await render(<ActionRow icon="heart" label="Share" onPress={jest.fn()} />);
    expect(row()).toMatchObject({ minHeight: layout.controlHeight, gap: layout.gap });
    expect(row()).not.toHaveProperty("marginHorizontal");
    expect(svgRoots(screen.toJSON())[0]?.props.width).toBe(icon.size.md);
  });

  it("on Android is the Material 3 list item, full width through the sheet padding", async () => {
    Platform.OS = "android";
    await render(<ActionRow icon="heart" label="Share" onPress={jest.fn()} />);
    expect(row()).toMatchObject({
      minHeight: layout.actionRowHeightAndroid,
      marginHorizontal: -spacing.xl,
      paddingHorizontal: spacing.xl,
      gap: spacing.lg,
      paddingVertical: 0,
    });
    expect(svgRoots(screen.toJSON())[0]?.props.width).toBe(icon.size.actionRowAndroid);
  });

  it("calls onPress", async () => {
    const onPress = jest.fn();
    await render(<ActionRow icon="heart" label="Share" onPress={onPress} />);
    await fireEvent.press(screen.getByRole("button", { name: "Share" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("draws a destructive label in the error tone", async () => {
    await render(<ActionRow icon="heart" label="Share" onPress={jest.fn()} destructive />);
    expect(
      StyleSheet.flatten(screen.getByText("Share").props.style as StyleProp<TextStyle>).color,
    ).toBe(color.status.error);
  });
});

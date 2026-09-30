// packages/ui/test/components/Avatar.test.tsx
//
// Tests for the Avatar.
//
// Tested:
// - Avatar
//
// What is covered:
// - initials or the user icon, the gradient stop from the name, the press and its role, the plain view without onPress, the creator size
//
// Run with: pnpm --filter @beatly/ui test -- Avatar
//
// SEE: packages/ui/src/components/Avatar.tsx

import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { processColor, StyleSheet, type ViewStyle } from "react-native";

import { Avatar } from "../../src/components/Avatar.tsx";
import { layout } from "../../src/tokens/spacing.ts";
import { avatarGradient } from "../../src/components/avatarIdentity.ts";

interface JsonNode {
  props: Record<string, unknown>;
  children: unknown;
}

function isJsonNode(value: unknown): value is JsonNode {
  return typeof value === "object" && value !== null && "props" in value;
}

// Collects, from the rendered tree, every node whose props include the given key.
function nodesWithProp(tree: unknown, key: string): JsonNode[] {
  const found: JsonNode[] = [];
  const visit = (node: unknown) => {
    if (Array.isArray(node)) node.forEach(visit);
    if (!isJsonNode(node)) return;
    if (key in node.props) found.push(node);
    visit(node.children);
  };
  visit(tree);
  return found;
}

describe("Avatar", () => {
  it("draws the initials of the name", async () => {
    await render(<Avatar name="Max Reb" accessibilityLabel="Account" onPress={jest.fn()} />);
    expect(screen.getByText("MR")).toBeTruthy();
  });

  it("draws no text for no name", async () => {
    await render(<Avatar name={null} accessibilityLabel="Account" onPress={jest.fn()} />);
    expect(screen.queryByText(/\S/)).toBeNull();
  });

  it("starts the gradient at the first color of the name's palette entry", async () => {
    await render(<Avatar name="Max Reb" accessibilityLabel="Account" onPress={jest.fn()} />);
    const [gradient] = nodesWithProp(screen.toJSON(), "gradient");
    // The svg renderer stores the gradient as [offset, color, offset, color] with signed ARGB colors.
    const expected = Number(processColor(avatarGradient("Max Reb")[0])) | 0;
    expect(gradient?.props.gradient).toEqual(expect.arrayContaining([0, expected]));
  });

  it("is not a button without onPress", async () => {
    await render(<Avatar name="Max Reb" />);
    expect(screen.getByText("MR")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("draws the creator size at layout.creatorMark", async () => {
    await render(<Avatar name="Max Reb" size="creator" />);
    const root = screen.toJSON();
    const style = StyleSheet.flatten(
      (isJsonNode(root) ? root.props.style : undefined) as ViewStyle,
    );
    expect(style.width).toBe(layout.creatorMark);
    expect(style.height).toBe(layout.creatorMark);
  });

  it("calls onPress and exposes a button with the given label", async () => {
    const onPress = jest.fn();
    await render(<Avatar name="Max Reb" accessibilityLabel="Account" onPress={onPress} />);
    await fireEvent.press(screen.getByRole("button", { name: "Account" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

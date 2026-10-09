// packages/ui/test/components/Button.test.tsx
//
// Tests for the Button's press, disabled and loading behavior.
//
// Tested:
// - Button
//
// What is covered:
// - onPress fires on a press, and does not fire while disabled or loading
// - Loading swaps the label for a spinner but keeps the accessible name
// - the optional glyph before the label, and fill taking its share of a row at the control height
//
// Run with: pnpm --filter @beatly/ui test -- Button
//
// SEE: packages/ui/src/components/Button.tsx

import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { Button } from "../../src/components/Button.tsx";
import { layout } from "../../src/tokens/spacing.ts";

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

describe("Button", () => {
  it("calls onPress when pressed", async () => {
    const onPress = jest.fn();
    await render(<Button label="Go" onPress={onPress} />);

    await fireEvent.press(screen.getByRole("button", { name: "Go" }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does not call onPress when disabled", async () => {
    const onPress = jest.fn();
    await render(<Button label="Go" onPress={onPress} disabled />);

    const button = screen.getByRole("button", { name: "Go" });
    await fireEvent.press(button);

    expect(button.props.accessibilityState).toMatchObject({ disabled: true });
    expect(onPress).not.toHaveBeenCalled();
  });

  it("shows a spinner instead of the label and ignores presses while loading", async () => {
    const onPress = jest.fn();
    await render(<Button label="Go" onPress={onPress} loading />);

    const button = screen.getByRole("button", { name: "Go" });
    await fireEvent.press(button);

    expect(screen.queryByText("Go")).toBeNull();
    expect(button.props.accessibilityState).toMatchObject({ busy: true });
    expect(onPress).not.toHaveBeenCalled();
  });

  it("draws the glyph before the label", async () => {
    const view = await render(<Button label="Go" onPress={jest.fn()} icon="play" />);
    expect(glyphs(screen.toJSON())).toHaveLength(1);
    expect(screen.getByText("Go")).toBeTruthy();
    await view.rerender(<Button label="Go" onPress={jest.fn()} />);
    expect(glyphs(screen.toJSON())).toHaveLength(0);
  });

  it("fills its share of a row at the control height", async () => {
    const view = await render(<Button label="Go" onPress={jest.fn()} fill />);
    expect(screen.getByRole("button", { name: "Go" })).toHaveStyle({
      flex: 1,
      height: layout.controlHeight,
    });
    await view.rerender(<Button label="Go" onPress={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Go" })).not.toHaveStyle({ flex: 1 });
  });
});

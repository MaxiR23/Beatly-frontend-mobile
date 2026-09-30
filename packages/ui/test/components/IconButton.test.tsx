// packages/ui/test/components/IconButton.test.tsx
//
// Tests for the IconButton.
//
// Tested:
// - IconButton
//
// What is covered:
// - the plain default, the primary variant box, the primaryCompact variant, the selected toggle states and their glyph tone, the busy indicator, the press
// - the glyph size by default, by variant and by iconSize, and the filled glyph
//
// Run with: pnpm --filter @beatly/ui test -- IconButton
//
// SEE: packages/ui/src/components/IconButton.tsx

import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { IconButton } from "../../src/components/IconButton.tsx";
import { color } from "../../src/tokens/color.ts";
import { icon } from "../../src/tokens/icon.ts";
import { radius } from "../../src/tokens/radius.ts";
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

describe("IconButton", () => {
  it("draws the plain default at the control height with no state", async () => {
    await render(<IconButton icon="x" accessibilityLabel="Close" onPress={jest.fn()} />);
    const button = screen.getByRole("button", { name: "Close" });
    expect(button).toHaveStyle({ width: layout.controlHeight, height: layout.controlHeight });
    expect(button.props.accessibilityState).toEqual({});
  });

  it("draws the primary variant as an accent circle of the play button size", async () => {
    await render(
      <IconButton icon="play" accessibilityLabel="Play" variant="primary" onPress={jest.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Play" })).toHaveStyle({
      width: layout.playButton,
      height: layout.playButton,
      borderRadius: radius.full,
      backgroundColor: color.accent.primary,
    });
  });

  it("draws primaryCompact as a control-height accent circle with an inverse lg glyph", async () => {
    await render(
      <IconButton
        icon="play"
        accessibilityLabel="Play"
        variant="primaryCompact"
        onPress={jest.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Play" })).toHaveStyle({
      width: layout.controlHeight,
      height: layout.controlHeight,
      borderRadius: radius.full,
      backgroundColor: color.accent.primary,
    });
    const [glyph] = glyphs(screen.toJSON());
    expect(glyph?.props).toMatchObject({
      width: icon.size.lg,
      stroke: color.text.inverse,
    });
  });

  it("sets the selected state for a toggle, on and off", async () => {
    const view = await render(
      <IconButton icon="shuffle" accessibilityLabel="Shuffle" selected onPress={jest.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Shuffle" }).props.accessibilityState).toEqual({
      selected: true,
    });
    expect(glyphs(screen.toJSON())[0]?.props.stroke).toBe(color.text.primary);
    await view.rerender(
      <IconButton
        icon="shuffle"
        accessibilityLabel="Shuffle"
        selected={false}
        onPress={jest.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Shuffle" }).props.accessibilityState).toEqual({
      selected: false,
    });
    expect(glyphs(screen.toJSON())[0]?.props.stroke).toBe(color.text.secondary);
  });

  it("draws the glyph at the given icon size, filled", async () => {
    await render(
      <IconButton
        icon="skipBack"
        iconSize="md"
        filled
        accessibilityLabel="Previous"
        onPress={jest.fn()}
      />,
    );
    const [glyph] = glyphs(screen.toJSON());
    expect(glyph?.props).toMatchObject({
      width: icon.size.md,
      height: icon.size.md,
      fill: color.text.primary,
      stroke: color.text.primary,
    });
  });

  it("draws the glyph unfilled by default", async () => {
    await render(<IconButton icon="x" accessibilityLabel="Close" onPress={jest.fn()} />);
    expect(glyphs(screen.toJSON())[0]?.props.fill).toBe("none");
  });

  it("keeps the large glyph by default and the extra-large one for primary", async () => {
    const view = await render(
      <IconButton icon="x" accessibilityLabel="Close" onPress={jest.fn()} />,
    );
    expect(glyphs(screen.toJSON())[0]?.props.width).toBe(icon.size.lg);
    await view.rerender(
      <IconButton icon="play" accessibilityLabel="Play" variant="primary" onPress={jest.fn()} />,
    );
    expect(glyphs(screen.toJSON())[0]?.props.width).toBe(icon.size.xl);
  });

  it("draws an activity indicator and the busy state instead of the glyph", async () => {
    await render(<IconButton icon="play" accessibilityLabel="Play" busy onPress={jest.fn()} />);
    const button = screen.getByRole("button", { name: "Play" });
    expect(button.props.accessibilityState).toEqual({ busy: true });
    expect(screen.getByTestId("icon-button-busy")).toBeTruthy();
  });

  it("calls onPress", async () => {
    const onPress = jest.fn();
    await render(<IconButton icon="x" accessibilityLabel="Close" onPress={onPress} />);
    await fireEvent.press(screen.getByRole("button", { name: "Close" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

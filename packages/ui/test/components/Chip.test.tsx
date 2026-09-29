// packages/ui/test/components/Chip.test.tsx
//
// Tests for the Chip.
//
// Tested:
// - Chip
//
// What is covered:
// - the selected state, its background from the state, the press
//
// Run with: pnpm --filter @beatly/ui test -- Chip
//
// SEE: packages/ui/src/components/Chip.tsx

import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";

import { Chip } from "../../src/components/Chip.tsx";
import { color } from "../../src/tokens/color.ts";

function background(node: { props: { style?: unknown } }): unknown {
  return StyleSheet.flatten(node.props.style as StyleProp<ViewStyle>).backgroundColor;
}

describe("Chip", () => {
  it("is selected with the accent background", async () => {
    await render(<Chip label="Hits" selected onPress={jest.fn()} />);
    const chip = screen.getByRole("button", { name: "Hits" });
    expect(chip.props.accessibilityState).toEqual({ selected: true });
    expect(background(chip)).toBe(color.accent.primary);
  });

  it("is not selected with the control background", async () => {
    await render(<Chip label="Hits" selected={false} onPress={jest.fn()} />);
    const chip = screen.getByRole("button", { name: "Hits" });
    expect(chip.props.accessibilityState).toEqual({ selected: false });
    expect(background(chip)).toBe(color.surface.control);
  });

  it("calls onPress", async () => {
    const onPress = jest.fn();
    await render(<Chip label="Hits" selected={false} onPress={onPress} />);
    await fireEvent.press(screen.getByRole("button", { name: "Hits" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

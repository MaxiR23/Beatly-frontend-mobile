// packages/ui/test/components/SegmentedControl.test.tsx
//
// Tests for the SegmentedControl.
//
// Tested:
// - SegmentedControl
//
// What is covered:
// - the options as tabs with the selected state, the press of another option and of the selected one
// - the container and selected backgrounds and the option height from tokens
//
// Run with: pnpm --filter @beatly/ui test -- SegmentedControl
//
// SEE: packages/ui/src/components/SegmentedControl.tsx

import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { SegmentedControl } from "../../src/components/SegmentedControl.tsx";
import { color } from "../../src/tokens/color.ts";
import { layout } from "../../src/tokens/spacing.ts";

const options = [
  { key: "a", label: "Up next" },
  { key: "b", label: "Lyrics" },
  { key: "c", label: "Related" },
] as const;

describe("SegmentedControl", () => {
  it("draws the options as tabs with the selected state", async () => {
    await render(
      <SegmentedControl options={options} selected="b" onChange={jest.fn()} testID="segments" />,
    );
    expect(screen.getByTestId("segments").props.accessibilityRole).toBe("tablist");
    expect(screen.getAllByRole("tab")).toHaveLength(3);
    expect(screen.getByRole("tab", { name: "Lyrics" }).props.accessibilityState).toEqual({
      selected: true,
    });
    expect(screen.getByRole("tab", { name: "Up next" }).props.accessibilityState).toEqual({
      selected: false,
    });
  });

  it("calls onChange with the key of another option", async () => {
    const onChange = jest.fn();
    await render(<SegmentedControl options={options} selected="a" onChange={onChange} />);
    await fireEvent.press(screen.getByRole("tab", { name: "Related" }));
    expect(onChange).toHaveBeenCalledWith("c");
  });

  it("does not call onChange when the selected option is pressed", async () => {
    const onChange = jest.fn();
    await render(<SegmentedControl options={options} selected="a" onChange={onChange} />);
    await fireEvent.press(screen.getByRole("tab", { name: "Up next" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("draws the container, the selected option and the option height from tokens", async () => {
    await render(
      <SegmentedControl options={options} selected="b" onChange={jest.fn()} testID="segments" />,
    );
    expect(screen.getByTestId("segments")).toHaveStyle({ backgroundColor: color.overlay.subtle });
    expect(screen.getByRole("tab", { name: "Lyrics" })).toHaveStyle({
      backgroundColor: color.overlay.muted,
      height: layout.chipHeight,
    });
    expect(screen.getByRole("tab", { name: "Up next" })).not.toHaveStyle({
      backgroundColor: color.overlay.muted,
    });
  });
});

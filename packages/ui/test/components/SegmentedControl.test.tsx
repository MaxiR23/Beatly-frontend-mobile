// packages/ui/test/components/SegmentedControl.test.tsx
//
// Tests for the SegmentedControl.
//
// Tested:
// - SegmentedControl
//
// What is covered:
// - iOS: the options as tabs with the selected state, the press of another option and of the selected one, the container and selected backgrounds and the option height from tokens, no indicator
// - Android: the Material 3 primary tabs: full-width row with the divider, each tab layout.controlHeight with the label centered, the selected label in the primary tone and the others in the secondary, the tab role and selected state, the press of another tab and of the selected one
// - Android: no indicator before the layout; the indicator under the selected label, as wide as it, layout.tabIndicatorHeightAndroid tall with radius.full top corners in color.accent.primary; placed without sliding at first; sliding to the new tab with Animated.timing on the native driver for motion.duration.base; under reduce motion moved without sliding
//
// Run with: pnpm --filter @beatly/ui test -- SegmentedControl
//
// SEE: packages/ui/src/components/SegmentedControl.tsx

import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Animated, Platform, type StyleProp, type TextStyle, type ViewStyle } from "react-native";

import { SegmentedControl } from "../../src/components/SegmentedControl.tsx";
import { border } from "../../src/tokens/border.ts";
import { color } from "../../src/tokens/color.ts";
import { motion } from "../../src/tokens/motion.ts";
import { radius } from "../../src/tokens/radius.ts";
import { layout } from "../../src/tokens/spacing.ts";
import { flatStyle } from "../helpers/flatStyle.ts";

const options = [
  { key: "a", label: "Up next" },
  { key: "b", label: "Lyrics" },
  { key: "c", label: "Related" },
] as const;

const timing = jest.spyOn(Animated, "timing");

afterEach(() => {
  Platform.OS = "ios";
  timing.mockClear();
});

function flat(node: { props: { style?: unknown } }): ViewStyle {
  return flatStyle(node.props.style);
}

function labelColor(label: string): unknown {
  return flatStyle(screen.getByText(label).props.style as StyleProp<TextStyle>).color;
}

const labelWidths = { a: 60, b: 50, c: 70 } as const;

async function layoutAll() {
  const tabs = screen.getAllByRole("tab");
  for (const [i, tab] of tabs.entries()) {
    await fireEvent(tab, "layout", {
      nativeEvent: { layout: { x: i * 120, y: 0, width: 120, height: 48 } },
    });
  }
  for (const key of ["a", "b", "c"] as const) {
    await fireEvent(screen.getByTestId(`segments-label-${key}`), "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: labelWidths[key], height: 20 } },
    });
  }
}

describe("SegmentedControl on iOS", () => {
  it("draws the options as tabs with the selected state", async () => {
    await render(
      <SegmentedControl
        options={options}
        selected="b"
        onChange={jest.fn()}
        reduceMotion={false}
        testID="segments"
      />,
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
    await render(
      <SegmentedControl options={options} selected="a" onChange={onChange} reduceMotion={false} />,
    );
    await fireEvent.press(screen.getByRole("tab", { name: "Related" }));
    expect(onChange).toHaveBeenCalledWith("c");
  });

  it("does not call onChange when the selected option is pressed", async () => {
    const onChange = jest.fn();
    await render(
      <SegmentedControl options={options} selected="a" onChange={onChange} reduceMotion={false} />,
    );
    await fireEvent.press(screen.getByRole("tab", { name: "Up next" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("draws the container, the selected option and the option height from tokens", async () => {
    await render(
      <SegmentedControl
        options={options}
        selected="b"
        onChange={jest.fn()}
        reduceMotion={false}
        testID="segments"
      />,
    );
    expect(screen.getByTestId("segments")).toHaveStyle({ backgroundColor: color.overlay.subtle });
    expect(screen.getByRole("tab", { name: "Lyrics" })).toHaveStyle({
      backgroundColor: color.overlay.muted,
      height: layout.chipHeight,
    });
    expect(screen.getByRole("tab", { name: "Up next" })).not.toHaveStyle({
      backgroundColor: color.overlay.muted,
    });
    expect(screen.queryByTestId("segments-indicator")).toBeNull();
  });
});

describe("SegmentedControl on Android", () => {
  const draw = (selected: "a" | "b" | "c", reduceMotion = false) => (
    <SegmentedControl
      options={options}
      selected={selected}
      onChange={jest.fn()}
      reduceMotion={reduceMotion}
      testID="segments"
    />
  );

  it("draws a full-width row with a divider and tabs of the control height", async () => {
    Platform.OS = "android";
    await render(draw("b"));
    const row = flat(screen.getByTestId("segments"));
    expect(screen.getByTestId("segments").props.accessibilityRole).toBe("tablist");
    expect(row.borderBottomWidth).toBe(border.width);
    expect(row.borderBottomColor).toBe(color.surface.border);
    expect(row).not.toHaveProperty("backgroundColor");
    expect(row).not.toHaveProperty("borderRadius");
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    for (const tab of tabs) {
      const style = flat(tab);
      expect(style.flex).toBe(1);
      expect(style.height).toBe(layout.controlHeight);
      expect(style.alignItems).toBe("center");
      expect(style.justifyContent).toBe("center");
      expect(style).not.toHaveProperty("borderRadius");
    }
  });

  it("draws the selected label in the primary tone and the others in the secondary", async () => {
    Platform.OS = "android";
    await render(draw("b"));
    expect(labelColor("Lyrics")).toBe(color.text.primary);
    expect(labelColor("Up next")).toBe(color.text.secondary);
    expect(labelColor("Related")).toBe(color.text.secondary);
    expect(screen.getByRole("tab", { name: "Lyrics" }).props.accessibilityState).toEqual({
      selected: true,
    });
    expect(screen.getByRole("tab", { name: "Up next" }).props.accessibilityState).toEqual({
      selected: false,
    });
  });

  it("calls onChange for another tab and not for the selected one", async () => {
    Platform.OS = "android";
    const onChange = jest.fn();
    await render(
      <SegmentedControl options={options} selected="a" onChange={onChange} reduceMotion={false} />,
    );
    await fireEvent.press(screen.getByRole("tab", { name: "Up next" }));
    expect(onChange).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole("tab", { name: "Related" }));
    expect(onChange).toHaveBeenCalledWith("c");
  });

  it("draws the indicator under the selected label once laid out, without sliding", async () => {
    Platform.OS = "android";
    await render(draw("b"));
    expect(screen.queryByTestId("segments-indicator")).toBeNull();
    await layoutAll();
    const style = flat(screen.getByTestId("segments-indicator"));
    expect(style.width).toBe(50);
    expect(style.height).toBe(layout.tabIndicatorHeightAndroid);
    expect(style.borderTopLeftRadius).toBe(radius.full);
    expect(style.borderTopRightRadius).toBe(radius.full);
    expect(style).not.toHaveProperty("borderBottomLeftRadius");
    expect(style).not.toHaveProperty("borderBottomRightRadius");
    expect(style.backgroundColor).toBe(color.accent.primary);
    expect(style.transform).toEqual([{ translateX: 155 }]);
    expect(timing).not.toHaveBeenCalled();
  });

  it("slides the indicator to the new tab on the native driver", async () => {
    Platform.OS = "android";
    const screenRender = await render(draw("b"));
    await layoutAll();
    await screenRender.rerender(draw("c"));
    expect(timing).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        toValue: 265,
        duration: motion.duration.base,
        useNativeDriver: true,
      }),
    );
    expect(flat(screen.getByTestId("segments-indicator")).width).toBe(70);
  });

  it("moves the indicator without sliding under reduce motion", async () => {
    Platform.OS = "android";
    const screenRender = await render(draw("b", true));
    await layoutAll();
    await screenRender.rerender(draw("c", true));
    expect(timing).not.toHaveBeenCalled();
    expect(flat(screen.getByTestId("segments-indicator")).transform).toEqual([{ translateX: 265 }]);
  });
});

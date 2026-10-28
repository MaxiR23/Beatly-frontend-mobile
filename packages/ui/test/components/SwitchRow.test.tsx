// packages/ui/test/components/SwitchRow.test.tsx
//
// Tests for the SwitchRow's switch on each platform.
//
// Tested:
// - SwitchRow
//
// What is covered:
// - iOS: the native Switch with today's token colors, value and label; the switch role, checked state and name; valueChange calls onValueChange; no animation
// - Android: the layout.switchTrack*Android track with radius.full and a border.widthFocused outline; off: color.surface.control with a color.surface.border outline and the small thumb at the start in color.text.primary; on: color.accent.primary and the large thumb at the end in color.text.inverse; a tap calls onValueChange with the new value; Animated.timing on the native driver for motion.duration.base on toggle, none on first render; at once under reduce motion; the thumb grows to the pressed size while pressed; the switch role, checked state and name
//
// Run with: pnpm --filter @beatly/ui test -- SwitchRow
//
// SEE: packages/ui/src/components/SwitchRow.tsx

import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Animated, Platform, type ViewStyle } from "react-native";

import { SwitchRow } from "../../src/components/SwitchRow.tsx";
import { border } from "../../src/tokens/border.ts";
import { color } from "../../src/tokens/color.ts";
import { motion } from "../../src/tokens/motion.ts";
import { radius } from "../../src/tokens/radius.ts";
import { layout } from "../../src/tokens/spacing.ts";
import { flatStyle } from "../helpers/flatStyle.ts";

const timing = jest.spyOn(Animated, "timing");

afterEach(() => {
  Platform.OS = "ios";
  timing.mockClear();
});

function flat(node: { props: { style?: unknown } }): ViewStyle {
  return flatStyle(node.props.style);
}

const travel = layout.switchTrackWidthAndroid - layout.switchTrackHeightAndroid;
const offScale = layout.switchThumbOffAndroid / layout.switchThumbPressedAndroid;
const onScale = layout.switchThumbOnAndroid / layout.switchThumbPressedAndroid;

const track = () => screen.getByTestId("switch-track");
const thumb = () => screen.getByTestId("switch-thumb");

function row(
  value: boolean,
  reduceMotion = false,
  onValueChange: (v: boolean) => void = jest.fn(),
) {
  return (
    <SwitchRow
      label="Public"
      helper="Anyone"
      value={value}
      onValueChange={onValueChange}
      reduceMotion={reduceMotion}
    />
  );
}

describe("SwitchRow on iOS", () => {
  it("draws the native switch with today's colors", async () => {
    const view = await render(row(false));
    expect(screen.getByRole("switch", { name: "Public", checked: false })).toBeTruthy();
    const off = screen.getByRole("switch");
    expect(off.props.onTintColor).toBe(color.accent.primary);
    expect(off.props.tintColor).toBe(color.surface.border);
    expect(off.props.thumbTintColor).toBe(color.text.primary);
    expect(flat(off).backgroundColor).toBe(color.surface.border);

    await view.rerender(row(true));
    expect(screen.getByRole("switch", { name: "Public", checked: true })).toBeTruthy();
    expect(screen.getByRole("switch").props.thumbTintColor).toBe(color.text.inverse);
    expect(screen.queryByTestId("switch-track")).toBeNull();
  });

  it("calls onValueChange from the native switch", async () => {
    const onValueChange = jest.fn();
    await render(row(false, false, onValueChange));
    await fireEvent(screen.getByRole("switch", { name: "Public" }), "valueChange", true);
    expect(onValueChange).toHaveBeenCalledWith(true);
    expect(timing).not.toHaveBeenCalled();
  });
});

describe("SwitchRow on Android", () => {
  it("draws a 52x32 track", async () => {
    Platform.OS = "android";
    await render(row(false));
    expect(flat(track())).toMatchObject({
      width: layout.switchTrackWidthAndroid,
      height: layout.switchTrackHeightAndroid,
      borderRadius: radius.full,
      borderWidth: border.widthFocused,
    });
  });

  it("off: outlined track and small thumb at the start", async () => {
    Platform.OS = "android";
    await render(row(false));
    expect(flat(track())).toMatchObject({
      backgroundColor: color.surface.control,
      borderColor: color.surface.border,
    });
    expect(flat(thumb()).transform).toEqual([{ translateX: 0 }, { scale: offScale }]);
    expect(flat(thumb()).backgroundColor).toBe(color.text.primary);
  });

  it("on: filled track and large thumb at the end", async () => {
    Platform.OS = "android";
    await render(row(true));
    expect(flat(track())).toMatchObject({
      backgroundColor: color.accent.primary,
      borderColor: color.accent.primary,
    });
    expect(flat(thumb()).transform).toEqual([{ translateX: travel }, { scale: onScale }]);
    expect(flat(thumb()).backgroundColor).toBe(color.text.inverse);
    expect(timing).not.toHaveBeenCalled();
  });

  it("a tap calls onValueChange with the new value", async () => {
    Platform.OS = "android";
    const onValueChange = jest.fn();
    const view = await render(row(false, false, onValueChange));
    await fireEvent.press(screen.getByRole("switch", { name: "Public" }));
    expect(onValueChange).toHaveBeenLastCalledWith(true);
    await view.rerender(row(true, false, onValueChange));
    await fireEvent.press(screen.getByRole("switch", { name: "Public" }));
    expect(onValueChange).toHaveBeenLastCalledWith(false);
  });

  it("toggling slides and grows the thumb on the native driver", async () => {
    Platform.OS = "android";
    const view = await render(row(false));
    await view.rerender(row(true));
    const options = expect.objectContaining({
      duration: motion.duration.base,
      useNativeDriver: true,
    });
    expect(timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ toValue: 1 }));
    expect(timing).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: onScale }),
    );
    for (const call of timing.mock.calls) expect(call[1]).toEqual(options);
  });

  it("changes at once under reduce motion", async () => {
    Platform.OS = "android";
    const view = await render(row(false, true));
    await view.rerender(row(true, true));
    expect(timing).not.toHaveBeenCalled();
    expect(flat(thumb()).transform).toEqual([{ translateX: travel }, { scale: onScale }]);
  });

  it("the thumb grows while pressed", async () => {
    Platform.OS = "android";
    const view = await render(row(false, true));
    await fireEvent(track(), "pressIn");
    expect(flat(thumb()).transform).toEqual([{ translateX: 0 }, { scale: 1 }]);
    await fireEvent(track(), "pressOut");
    expect(flat(thumb()).transform).toEqual([{ translateX: 0 }, { scale: offScale }]);
    await view.unmount();

    await render(row(false));
    await fireEvent(track(), "pressIn");
    expect(timing).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: 1, useNativeDriver: true }),
    );
  });

  it("exposes the switch role, its checked state and its name", async () => {
    Platform.OS = "android";
    const view = await render(row(false));
    expect(screen.getByRole("switch", { name: "Public", checked: false })).toBeTruthy();
    await view.rerender(row(true));
    expect(screen.getByRole("switch", { name: "Public", checked: true })).toBeTruthy();
  });
});

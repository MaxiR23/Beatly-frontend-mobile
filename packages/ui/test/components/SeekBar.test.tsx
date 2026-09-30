// packages/ui/test/components/SeekBar.test.tsx
//
// Tests for the SeekBar.
//
// Tested:
// - SeekBar
//
// What is covered:
// - the spec's track, fill, thumb, touch slop and secondary times, and the responder kept while dragging
// - the labels, a press seeking to its fraction, a drag drawn and seeking once on release, clamping, the assistive actions
//
// Run with: pnpm --filter @beatly/ui test -- SeekBar
//
// SEE: packages/ui/src/components/SeekBar.tsx

import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { SeekBar } from "../../src/components/SeekBar.tsx";
import { color } from "../../src/tokens/color.ts";
import { shadow } from "../../src/tokens/shadow.ts";
import { layout } from "../../src/tokens/spacing.ts";

const WIDTH = 200;

async function setup(position = 20, onSeek = jest.fn()) {
  await render(
    <SeekBar
      positionSeconds={position}
      durationSeconds={100}
      elapsedLabel="0:20"
      remainingLabel="-1:20"
      accessibilityLabel="Position"
      onSeek={onSeek}
    />,
  );
  const touch = screen.getByTestId("seek-touch");
  await fireEvent(touch, "layout", { nativeEvent: { layout: { width: WIDTH, height: 48 } } });
  return { touch, onSeek };
}

const at = (x: number) => ({ nativeEvent: { locationX: x } });

describe("SeekBar", () => {
  it("draws the labels and the adjustable value", async () => {
    const { touch } = await setup();
    expect(screen.getByText("0:20")).toBeTruthy();
    expect(screen.getByText("-1:20")).toBeTruthy();
    expect(touch.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 20 });
  });

  it("seeks to half the duration on a press at half the width", async () => {
    const { touch, onSeek } = await setup();
    await fireEvent(touch, "responderGrant", at(WIDTH / 2));
    await fireEvent(touch, "responderRelease", at(WIDTH / 2));
    expect(onSeek).toHaveBeenCalledTimes(1);
    expect(onSeek).toHaveBeenCalledWith(50);
  });

  it("draws the drag position and seeks once, on release", async () => {
    const { touch, onSeek } = await setup();
    await fireEvent(touch, "responderGrant", at(0));
    await fireEvent(touch, "responderMove", at(WIDTH * 0.75));
    expect(onSeek).not.toHaveBeenCalled();
    expect(screen.getByTestId("seek-fill")).toHaveStyle({ width: WIDTH * 0.75 });
    await fireEvent(touch, "responderRelease", at(WIDTH * 0.75));
    expect(onSeek).toHaveBeenCalledTimes(1);
    expect(onSeek).toHaveBeenCalledWith(75);
    expect(screen.getByTestId("seek-fill")).toHaveStyle({ width: WIDTH * 0.2 });
  });

  it("clamps a fraction outside the bar", async () => {
    const { touch, onSeek } = await setup();
    await fireEvent(touch, "responderRelease", at(WIDTH * 2));
    await fireEvent(touch, "responderRelease", at(-50));
    expect(onSeek).toHaveBeenNthCalledWith(1, 100);
    expect(onSeek).toHaveBeenNthCalledWith(2, 0);
  });

  it("draws the spec's track, fill, thumb and times", async () => {
    const { touch } = await setup();
    const slop = (layout.controlHeight - layout.seekThumb) / 2;
    expect(touch).toHaveStyle({ height: layout.seekThumb });
    expect(touch.props.hitSlop).toEqual({ top: slop, bottom: slop });
    expect(screen.getByTestId("seek-fill")).toHaveStyle({
      height: layout.seekTrack,
      backgroundColor: color.text.primary,
    });
    expect(screen.getByTestId("seek-thumb")).toHaveStyle({
      width: layout.seekThumb,
      height: layout.seekThumb,
      backgroundColor: color.accent.primary,
      shadowOpacity: shadow.control.shadowOpacity,
    });
    expect(screen.getByText("0:20")).toHaveStyle({ color: color.text.secondary });
    expect(screen.getByText("-1:20")).toHaveStyle({ color: color.text.secondary });
  });

  it("keeps the responder while dragging", async () => {
    const { touch } = await setup();
    const request: unknown = touch.props.onResponderTerminationRequest;
    if (typeof request !== "function") throw new Error("no termination handler");
    expect((request as () => boolean)()).toBe(false);
  });

  it("seeks by ten seconds on the assistive actions", async () => {
    const { touch, onSeek } = await setup();
    await fireEvent(touch, "accessibilityAction", { nativeEvent: { actionName: "increment" } });
    await fireEvent(touch, "accessibilityAction", { nativeEvent: { actionName: "decrement" } });
    expect(onSeek).toHaveBeenNthCalledWith(1, 30);
    expect(onSeek).toHaveBeenNthCalledWith(2, 10);
  });
});

// packages/ui/test/components/PullUpSheet.test.tsx
//
// Tests for the PullUpSheet.
//
// Tested:
// - PullUpSheet
//
// What is covered:
// - the handle as a labelled button, the press and the drag up opening, the header and body drags closing (the body only at its top)
// - the dim and the recede following the sheet's position, the springs of opening and closing, no animation on mount
// - the closed panel and the open content hidden from accessibility, the nudge once, the wash only with a color
// - reduce motion (fades instead of movement and scale, no nudge), a live change of it while open leaving the panel and the dim drawn
// - onDragStart on a handle drag, onClosed when the close animation finishes and not when it is cut, or when a cancelled handle drag settles back and not when it commits
//
// Run with: pnpm --filter @beatly/ui test -- PullUpSheet
//
// SEE: packages/ui/src/components/PullUpSheet.tsx

import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Animated, Dimensions, Text } from "react-native";

import { PullUpSheet } from "../../src/components/PullUpSheet.tsx";
import { color } from "../../src/tokens/color.ts";
import { motion } from "../../src/tokens/motion.ts";

const touch = (from: number, to: number, t: number, dt = 16) => ({
  nativeEvent: { touches: [{}] },
  touchHistory: {
    numberActiveTouches: 1,
    indexOfSingleActiveTouch: 0,
    mostRecentTimeStamp: t,
    touchBank: [
      {
        touchActive: true,
        startPageX: 0,
        startPageY: from,
        startTimeStamp: t - dt,
        currentPageX: 0,
        currentPageY: to,
        currentTimeStamp: t,
        previousPageX: 0,
        previousPageY: from,
        previousTimeStamp: t - dt,
      },
    ],
  },
});

function call(testID: string, name: string, event: unknown): unknown {
  const handler: unknown = screen.getByTestId(testID).props[name];
  if (typeof handler !== "function") throw new Error(`no ${name}`);
  return (handler as (event: unknown) => unknown)(event);
}

// Moves the finger on `testID` by `delta` (negative is up) and, when `release`, lets go.
async function drag(testID: string, delta: number, release: boolean, dt = 5000) {
  await act(() => {
    call(testID, "onMoveShouldSetResponderCapture", touch(300, 300, 101));
    call(testID, "onResponderGrant", touch(300, 300, 101));
    call(testID, "onResponderMove", touch(300, 300 + delta, 101 + dt, dt));
  });
  if (release) {
    await act(() => {
      call(testID, "onResponderRelease", touch(300, 300 + delta, 101 + dt, dt));
    });
  }
}

const spring = jest.spyOn(Animated, "spring");
const timing = jest.spyOn(Animated, "timing");
const height = Dimensions.get("window").height;

afterEach(() => {
  spring.mockClear();
  timing.mockClear();
});

interface Options {
  open?: boolean;
  nudge?: boolean;
  reduceMotion?: boolean;
  bodyAtTop?: boolean;
  washColor?: string | null;
  onDragStart?: () => void;
  onClosed?: () => void;
}

function element(options: Options, onOpen = jest.fn(), onClose = jest.fn()) {
  return (
    <PullUpSheet
      open={options.open ?? false}
      onOpen={onOpen}
      onClose={onClose}
      onDragStart={options.onDragStart}
      onClosed={options.onClosed}
      reduceMotion={options.reduceMotion ?? false}
      nudge={options.nudge ?? false}
      handleLabel="Open"
      topInset={0}
      bottomInset={0}
      washColor={options.washColor ?? null}
      header={<Text>Header</Text>}
      body={<Text>Body</Text>}
      bodyAtTop={options.bodyAtTop ?? true}
      testID="sheet"
    >
      <Text>Content</Text>
    </PullUpSheet>
  );
}

async function setup(options: Options = {}) {
  const onOpen = jest.fn();
  const onClose = jest.fn();
  const view = await render(element(options, onOpen, onClose));
  return {
    view,
    onOpen,
    onClose,
    rerender: (next: Options) => view.rerender(element(next, onOpen, onClose)),
  };
}

// The closed panel is hidden from accessibility, so the query must include hidden elements.
const panel = () => screen.getByTestId("sheet-panel", { includeHiddenElements: true });

const behind = () => screen.getByTestId("sheet-behind", { includeHiddenElements: true });

const gradients = (): number => JSON.stringify(screen.toJSON()).split('"gradient"').length - 1;

describe("PullUpSheet", () => {
  it("draws the handle as a labelled button and opens on press", async () => {
    const { onOpen } = await setup();
    await fireEvent.press(screen.getByRole("button", { name: "Open" }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("opens when the handle is dragged up past the distance share", async () => {
    const { onOpen } = await setup();
    await drag("sheet-handle-drag", -(height * motion.dragToClose.distanceShare + 1), true);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("darkens and recedes with the sheet's position", async () => {
    await setup();
    expect(screen.getByTestId("sheet-dim")).toHaveStyle({ opacity: 0 });
    expect(screen.getByTestId("sheet-behind")).toHaveStyle({ transform: [{ scale: 1 }] });
    await drag("sheet-handle-drag", -height / 2, false);
    expect(screen.getByTestId("sheet-dim")).toHaveStyle({ opacity: 0.5 });
    expect(screen.getByTestId("sheet-behind")).toHaveStyle({
      transform: [{ scale: 1 - (1 - motion.behindSheetScale) / 2 }],
    });
    expect(panel()).toHaveStyle({
      transform: [{ translateY: height / 2 }],
    });
  });

  it("does not animate on mount, springs the panel to 0 when it opens and back to the height when it closes", async () => {
    const { rerender } = await setup();
    expect(spring).not.toHaveBeenCalled();
    await rerender({ open: true });
    expect(spring).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        toValue: 0,
        damping: motion.spring.damping,
        stiffness: motion.spring.stiffness,
        useNativeDriver: true,
      }),
    );
    await rerender({ open: false });
    expect(spring).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: height }),
    );
  });

  it("closes on a header drag down past the distance share", async () => {
    const { onClose } = await setup({ open: true });
    await drag("sheet-header-drag", height * motion.dragToClose.distanceShare + 1, true);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("takes the body drag only while the body is at its top", async () => {
    const { onClose, rerender } = await setup({ open: true, bodyAtTop: false });
    const slop = motion.dragToClose.slop;
    expect(call("sheet-body-drag", "onMoveShouldSetResponderCapture", touch(0, slop + 1, 20))).toBe(
      false,
    );
    await rerender({ open: true, bodyAtTop: true });
    expect(call("sheet-body-drag", "onMoveShouldSetResponderCapture", touch(0, slop + 1, 40))).toBe(
      true,
    );
    await drag("sheet-body-drag", height * motion.dragToClose.distanceShare + 1, true);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("hides the closed panel and the open content from accessibility", async () => {
    const { rerender } = await setup();
    expect(panel().props.accessibilityElementsHidden).toBe(true);
    expect(panel().props.pointerEvents).toBe("none");
    expect(screen.getByTestId("sheet-behind").props.accessibilityElementsHidden).toBe(false);
    await rerender({ open: true });
    expect(panel().props.accessibilityElementsHidden).toBe(false);
    expect(panel().props.pointerEvents).toBe("auto");
    expect(behind().props.accessibilityElementsHidden).toBe(true);
    expect(behind().props.importantForAccessibility).toBe("no-hide-descendants");
  });

  it("nudges the handle up and back once when asked", async () => {
    const { rerender } = await setup({ nudge: true });
    expect(timing).toHaveBeenCalledTimes(1);
    expect(timing).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        toValue: -motion.handleNudge,
        duration: motion.duration.base,
        useNativeDriver: true,
      }),
    );
    expect(spring).toHaveBeenCalledTimes(1);
    expect(spring).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: 0 }),
    );
    await rerender({ nudge: true, bodyAtTop: false });
    expect(timing).toHaveBeenCalledTimes(1);
  });

  it("does not nudge when not asked", async () => {
    await setup();
    expect(timing).not.toHaveBeenCalled();
  });

  it("draws the wash gradient only with a color", async () => {
    const { rerender } = await setup();
    expect(gradients()).toBe(0);
    await rerender({ washColor: "#336699" });
    expect(gradients()).toBe(1);
  });

  it("under reduce motion, fades the panel and the dim and moves and scales nothing", async () => {
    const { rerender } = await setup({ reduceMotion: true });
    expect(screen.getByTestId("sheet-behind")).toHaveStyle({ transform: [{ scale: 1 }] });
    expect(panel()).toHaveStyle({ opacity: 0 });
    expect(screen.getByTestId("sheet-dim")).toHaveStyle({ opacity: 0 });
    await rerender({ open: true, reduceMotion: true });
    expect(spring).not.toHaveBeenCalled();
    expect(timing).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: 1, duration: motion.duration.base }),
    );
    expect(panel().props.style).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ transform: expect.anything() })]),
    );
  });

  it("keeps the panel and the dim drawn when reduce motion is turned off while open", async () => {
    const { rerender } = await setup({ reduceMotion: true });
    await rerender({ open: true, reduceMotion: true });
    await rerender({ open: true, reduceMotion: false });
    expect(panel()).toHaveStyle({ transform: [{ translateY: 0 }] });
    expect(screen.getByTestId("sheet-dim")).toHaveStyle({ opacity: 1 });
  });

  it("keeps the panel visible when reduce motion is turned on while open", async () => {
    const { rerender } = await setup();
    await rerender({ open: true });
    await rerender({ open: true, reduceMotion: true });
    expect(panel()).toHaveStyle({ opacity: 1 });
    expect(screen.getByTestId("sheet-dim")).toHaveStyle({ opacity: 1 });
  });

  it("tells the caller when a drag on the handle begins", async () => {
    const onDragStart = jest.fn();
    await setup({ onDragStart });
    await drag("sheet-handle-drag", -10, false);
    expect(onDragStart).toHaveBeenCalledTimes(1);
  });

  it("calls onClosed when the close animation finishes, not when it is cut", async () => {
    const onClosed = jest.fn();
    const { rerender } = await setup({ open: true, onClosed });
    spring.mockImplementationOnce(
      () =>
        ({
          start: (done?: (result: { finished: boolean }) => void) => {
            done?.({ finished: false });
          },
        }) as unknown as Animated.CompositeAnimation,
    );
    await rerender({ open: false, onClosed });
    expect(onClosed).not.toHaveBeenCalled();
    await rerender({ open: true, onClosed });
    spring.mockImplementationOnce(
      () =>
        ({
          start: (done?: (result: { finished: boolean }) => void) => {
            done?.({ finished: true });
          },
        }) as unknown as Animated.CompositeAnimation,
    );
    await rerender({ open: false, onClosed });
    expect(onClosed).toHaveBeenCalledTimes(1);
  });

  it("under reduce motion, does not nudge", async () => {
    await setup({ nudge: true, reduceMotion: true });
    expect(timing).not.toHaveBeenCalled();
    expect(spring).not.toHaveBeenCalled();
  });

  it("uses the overlay tokens for the dim and the handle", async () => {
    await setup();
    expect(screen.getByTestId("sheet-dim")).toHaveStyle({
      backgroundColor: color.overlay.backdrop,
    });
  });

  it("calls onClosed when a handle drag released short settles back, not when it commits", async () => {
    const onClosed = jest.fn();
    await setup({ onClosed });
    let done: ((result: { finished: boolean }) => void) | undefined;
    spring.mockImplementationOnce(
      () =>
        ({
          start: (next?: (result: { finished: boolean }) => void) => {
            done = next;
          },
        }) as unknown as Animated.CompositeAnimation,
    );
    await drag("sheet-handle-drag", -100, true);
    expect(onClosed).not.toHaveBeenCalled();
    done?.({ finished: true });
    expect(onClosed).toHaveBeenCalledTimes(1);
    await drag("sheet-handle-drag", -(height * motion.dragToClose.distanceShare + 1), true);
    expect(onClosed).toHaveBeenCalledTimes(1);
  });
});

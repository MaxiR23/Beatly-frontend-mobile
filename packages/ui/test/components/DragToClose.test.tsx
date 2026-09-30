// packages/ui/test/components/DragToClose.test.tsx
//
// Tests for the DragToClose container.
//
// Tested:
// - DragToClose
//
// What is covered:
// - the capture gate (downward past the slop, not upward, sideways or disabled), following the finger and the clamp at rest
// - the spring back below the threshold and on termination, the close by distance and by flick, the gesture kept
// - reduce motion (no movement, no spring, still closes) and the assistive escape
//
// Run with: pnpm --filter @beatly/ui test -- DragToClose
//
// SEE: packages/ui/src/components/DragToClose.tsx

import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { act, render, screen } from "@testing-library/react-native";
import { Animated, Dimensions, View } from "react-native";

import { DragToClose } from "../../src/components/DragToClose.tsx";
import { motion } from "../../src/tokens/motion.ts";

// A single-touch history the PanResponder reads: the finger moved from `from` to `to` (page y, x fixed at
// `x`) and the move ended at time `t`, `dt` ms after the previous one.
const touch = (from: number, to: number, t: number, dt = 16, x = 0) => ({
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
        currentPageX: x,
        currentPageY: to,
        currentTimeStamp: t,
        previousPageX: 0,
        previousPageY: from,
        previousTimeStamp: t - dt,
      },
    ],
  },
});

// Calls a responder prop of the drag container, as SeekBar.test.tsx does for its termination handler.
function call(name: string, event: unknown): unknown {
  const handler: unknown = screen.getByTestId("drag").props[name];
  if (typeof handler !== "function") throw new Error(`no ${name}`);
  return (handler as (event: unknown) => unknown)(event);
}

const spring = jest.spyOn(Animated, "spring");
const height = Dimensions.get("window").height;

afterEach(() => {
  spring.mockClear();
});

async function setup(options: { enabled?: boolean; reduceMotion?: boolean } = {}) {
  const onClose = jest.fn();
  const element = (enabled: boolean, reduceMotion: boolean) => (
    <DragToClose onClose={onClose} enabled={enabled} reduceMotion={reduceMotion} testID="drag">
      <View />
    </DragToClose>
  );
  const view = await render(element(options.enabled ?? true, options.reduceMotion ?? false));
  return { onClose, view, element };
}

// Grants at y 20, moves by `distance` in `dt` ms, and leaves the gesture ready to release. The first
// capture call stamps the gesture at 101, as the responder system does, so the velocity spans `dt`.
async function drag(distance: number, dt = 5000) {
  await act(() => {
    call("onMoveShouldSetResponderCapture", touch(20, 20, 101));
    call("onResponderGrant", touch(20, 20, 101));
    call("onResponderMove", touch(20, 20 + distance, 101 + dt, dt));
  });
}

const release = (distance: number, dt = 5000) =>
  act(() => {
    call("onResponderRelease", touch(20, 20 + distance, 101 + dt, dt));
  });

describe("DragToClose", () => {
  it("takes a downward drag past the slop, and not an upward, sideways or disabled one", async () => {
    const { view, element } = await setup();
    const slop = motion.dragToClose.slop;
    await act(() => {
      call("onStartShouldSetResponderCapture", touch(0, 0, 10));
    });
    expect(call("onMoveShouldSetResponderCapture", touch(0, slop + 1, 20))).toBe(true);
    await act(() => {
      call("onStartShouldSetResponderCapture", touch(100, 100, 30));
    });
    expect(call("onMoveShouldSetResponderCapture", touch(100, 80, 40))).toBe(false);
    await act(() => {
      call("onStartShouldSetResponderCapture", touch(0, 0, 50));
    });
    expect(call("onMoveShouldSetResponderCapture", touch(0, 20, 60, 16, 40))).toBe(false);
    await view.rerender(element(false, false));
    await act(() => {
      call("onStartShouldSetResponderCapture", touch(0, 0, 70));
    });
    expect(call("onMoveShouldSetResponderCapture", touch(0, slop + 1, 80))).toBe(false);
  });

  it("follows the finger down and never above its place", async () => {
    await setup();
    await act(() => {
      call("onResponderGrant", touch(20, 20, 101));
      call("onResponderMove", touch(20, 120, 200));
    });
    expect(screen.getByTestId("drag")).toHaveStyle({ transform: [{ translateY: 100 }] });
    await act(() => {
      call("onResponderMove", touch(120, 0, 300));
    });
    expect(screen.getByTestId("drag")).toHaveStyle({ transform: [{ translateY: 0 }] });
  });

  it("springs back with the motion spring when released early", async () => {
    const { onClose } = await setup();
    await drag(100);
    await release(100);
    expect(onClose).not.toHaveBeenCalled();
    expect(spring).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        toValue: 0,
        damping: motion.spring.damping,
        stiffness: motion.spring.stiffness,
        useNativeDriver: true,
      }),
    );
  });

  it("closes when released past the distance share", async () => {
    const { onClose } = await setup();
    const distance = height * motion.dragToClose.distanceShare + 1;
    await drag(distance);
    await release(distance);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(spring).not.toHaveBeenCalled();
  });

  it("closes on a fast downward flick short of the distance", async () => {
    const { onClose } = await setup();
    await drag(40, 20);
    await release(40, 20);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("springs back when the gesture is taken away", async () => {
    await setup();
    await drag(100);
    await act(() => {
      call("onResponderTerminate", touch(20, 120, 6000, 5000));
    });
    expect(spring).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: 0 }),
    );
  });

  it("keeps the gesture once it has it", async () => {
    await setup();
    expect(call("onResponderTerminationRequest", {})).toBe(false);
  });

  it("under reduce motion, stays still and still closes past the distance", async () => {
    const { onClose } = await setup({ reduceMotion: true });
    await drag(100);
    expect(screen.getByTestId("drag")).toHaveStyle({ transform: [{ translateY: 0 }] });
    await release(100);
    expect(spring).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    const distance = height * motion.dragToClose.distanceShare + 1;
    await drag(distance);
    await release(distance);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on the assistive escape", async () => {
    const { onClose } = await setup();
    await act(() => {
      call("onAccessibilityEscape", {});
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

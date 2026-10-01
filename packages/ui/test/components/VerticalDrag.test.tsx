// packages/ui/test/components/VerticalDrag.test.tsx
//
// Tests for the VerticalDrag gesture.
//
// Tested:
// - VerticalDrag, in both directions
//
// What is covered:
// - the capture gate (past the slop in its direction, not the other way, sideways or disabled)
// - following the finger away from rest and the clamp at rest, the spring back to rest below the threshold and on termination
// - the commit by distance and by flick, the position left where the finger left it, the gesture kept
// - onSettle after the spring back of a released-short or taken-away drag (not when cut, not on a commit), right away under reduce motion
// - reduce motion (no movement, no spring, still commits)
//
// Run with: pnpm --filter @beatly/ui test -- VerticalDrag
//
// SEE: packages/ui/src/components/VerticalDrag.tsx

import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { act, render, screen } from "@testing-library/react-native";
import { useState } from "react";
import { Animated, Dimensions, View } from "react-native";

import { VerticalDrag } from "../../src/components/VerticalDrag.tsx";
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

interface HarnessProps {
  direction: "down" | "up";
  rest: number;
  enabled: boolean;
  reduceMotion: boolean;
  onCommit: () => void;
  onSettle?: (() => void) | undefined;
}

function Harness({ direction, rest, enabled, reduceMotion, onCommit, onSettle }: HarnessProps) {
  const [position] = useState(() => new Animated.Value(rest));
  return (
    <VerticalDrag
      direction={direction}
      position={position}
      rest={rest}
      enabled={enabled}
      reduceMotion={reduceMotion}
      onCommit={onCommit}
      onSettle={onSettle}
      style={{ transform: [{ translateY: position }] }}
      testID="drag"
    >
      <View />
    </VerticalDrag>
  );
}

async function setup(
  direction: "down" | "up",
  options: { enabled?: boolean; reduceMotion?: boolean } = {},
) {
  const onCommit = jest.fn();
  const onSettle = jest.fn();
  const rest = direction === "down" ? 0 : 500;
  const element = (enabled: boolean, reduceMotion: boolean) => (
    <Harness
      direction={direction}
      rest={rest}
      enabled={enabled}
      reduceMotion={reduceMotion}
      onCommit={onCommit}
      onSettle={onSettle}
    />
  );
  const view = await render(element(options.enabled ?? true, options.reduceMotion ?? false));
  return { onCommit, onSettle, view, element, rest };
}

// Moves by `distance` in the direction of the drag (`sign` -1 is up) and leaves the gesture ready to release.
async function drag(sign: 1 | -1, distance: number, dt = 5000) {
  await act(() => {
    call("onMoveShouldSetResponderCapture", touch(300, 300, 101));
    call("onResponderGrant", touch(300, 300, 101));
    call("onResponderMove", touch(300, 300 + sign * distance, 101 + dt, dt));
  });
}

const release = (sign: 1 | -1, distance: number, dt = 5000) =>
  act(() => {
    call("onResponderRelease", touch(300, 300 + sign * distance, 101 + dt, dt));
  });

// Makes the next spring hold its completion callback so the test decides when and how it ends.
function holdSpring() {
  const held: { done?: ((result: { finished: boolean }) => void) | undefined } = {};
  spring.mockImplementationOnce(
    () =>
      ({
        start: (done?: (result: { finished: boolean }) => void) => {
          held.done = done;
        },
      }) as unknown as Animated.CompositeAnimation,
  );
  return held;
}

const translate = (value: number) => ({ transform: [{ translateY: value }] });

describe.each([
  { direction: "down", sign: 1, rest: 0 },
  { direction: "up", sign: -1, rest: 500 },
] as const)("VerticalDrag $direction", ({ direction, sign, rest }) => {
  it("takes a drag past the slop in its direction, and not the other way, sideways or disabled", async () => {
    const { view, element } = await setup(direction);
    const slop = motion.dragToClose.slop;
    await act(() => {
      call("onStartShouldSetResponderCapture", touch(300, 300, 10));
    });
    expect(call("onMoveShouldSetResponderCapture", touch(300, 300 + sign * (slop + 1), 20))).toBe(
      true,
    );
    await act(() => {
      call("onStartShouldSetResponderCapture", touch(300, 300, 30));
    });
    expect(call("onMoveShouldSetResponderCapture", touch(300, 300 - sign * 20, 40))).toBe(false);
    await act(() => {
      call("onStartShouldSetResponderCapture", touch(300, 300, 50));
    });
    expect(call("onMoveShouldSetResponderCapture", touch(300, 300 + sign * 20, 60, 16, 40))).toBe(
      false,
    );
    await view.rerender(element(false, false));
    await act(() => {
      call("onStartShouldSetResponderCapture", touch(300, 300, 70));
    });
    expect(call("onMoveShouldSetResponderCapture", touch(300, 300 + sign * (slop + 1), 80))).toBe(
      false,
    );
  });

  it("follows the finger away from rest and never past it", async () => {
    await setup(direction);
    await act(() => {
      call("onResponderGrant", touch(300, 300, 101));
      call("onResponderMove", touch(300, 300 + sign * 100, 200));
    });
    expect(screen.getByTestId("drag")).toHaveStyle(translate(rest + sign * 100));
    await act(() => {
      call("onResponderMove", touch(300, 300 - sign * 100, 300));
    });
    expect(screen.getByTestId("drag")).toHaveStyle(translate(rest));
  });

  it("springs back to rest with the motion spring when released early", async () => {
    const { onCommit } = await setup(direction);
    await drag(sign, 100);
    await release(sign, 100);
    expect(onCommit).not.toHaveBeenCalled();
    expect(spring).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        toValue: rest,
        damping: motion.spring.damping,
        stiffness: motion.spring.stiffness,
        useNativeDriver: true,
      }),
    );
  });

  it("commits past the distance share and leaves the position where the finger left it", async () => {
    const { onCommit } = await setup(direction);
    const distance = height * motion.dragToClose.distanceShare + 1;
    await drag(sign, distance);
    await release(sign, distance);
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(spring).not.toHaveBeenCalled();
    expect(screen.getByTestId("drag")).toHaveStyle(translate(rest + sign * distance));
  });

  it("commits on a fast flick short of the distance", async () => {
    const { onCommit } = await setup(direction);
    await drag(sign, 40, 20);
    await release(sign, 40, 20);
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it("springs back when the gesture is taken away", async () => {
    await setup(direction);
    await drag(sign, 100);
    await act(() => {
      call("onResponderTerminate", touch(300, 300 + sign * 100, 6000, 5000));
    });
    expect(spring).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: rest }),
    );
  });

  it("calls onSettle when the spring back of a released-short drag finishes, not before or when cut", async () => {
    const { onSettle } = await setup(direction);
    const held = holdSpring();
    await drag(sign, 100);
    await release(sign, 100);
    expect(onSettle).not.toHaveBeenCalled();
    held.done?.({ finished: false });
    expect(onSettle).not.toHaveBeenCalled();
    held.done?.({ finished: true });
    expect(onSettle).toHaveBeenCalledTimes(1);
  });

  it("calls onSettle when the spring back of a taken-away gesture finishes", async () => {
    const { onSettle } = await setup(direction);
    const held = holdSpring();
    await drag(sign, 100);
    await act(() => {
      call("onResponderTerminate", touch(300, 300 + sign * 100, 6000, 5000));
    });
    expect(onSettle).not.toHaveBeenCalled();
    held.done?.({ finished: true });
    expect(onSettle).toHaveBeenCalledTimes(1);
  });

  it("does not call onSettle on a commit", async () => {
    const { onCommit, onSettle } = await setup(direction);
    const distance = height * motion.dragToClose.distanceShare + 1;
    await drag(sign, distance);
    await release(sign, distance);
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onSettle).not.toHaveBeenCalled();
  });

  it("keeps the gesture once it has it", async () => {
    await setup(direction);
    expect(call("onResponderTerminationRequest", {})).toBe(false);
  });

  it("under reduce motion, stays still and still commits past the distance", async () => {
    const { onCommit, onSettle } = await setup(direction, { reduceMotion: true });
    await drag(sign, 100);
    expect(screen.getByTestId("drag")).toHaveStyle(translate(rest));
    expect(onSettle).not.toHaveBeenCalled();
    await release(sign, 100);
    expect(spring).not.toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();
    expect(onSettle).toHaveBeenCalledTimes(1);
    const distance = height * motion.dragToClose.distanceShare + 1;
    await drag(sign, distance);
    await release(sign, distance);
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onSettle).toHaveBeenCalledTimes(1);
  });
});

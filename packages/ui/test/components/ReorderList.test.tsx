// packages/ui/test/components/ReorderList.test.tsx
//
// Tests for the ReorderList.
//
// Tested:
// - ReorderList
// - reorderIndexAt
// - autoScrollStep
//
// What is covered:
// - the row under the held row's centre, clamped to the ends
// - the auto-scroll step inside each edge, none in the middle, in proportion to the elapsed time
// - the remove button, the move up and down accessibility actions (none past the ends), the position value
// - a drag on the handle: a release past rows moves the row, a release on its own place or a taken-away drag moves nothing, the handle keeps the gesture, the list does not scroll while a row is held
// - auto-scroll while the held row is at the bottom edge
// - reduce motion makes room without animating
//
// Run with: pnpm --filter @beatly/ui test -- ReorderList
//
// SEE: packages/ui/src/components/ReorderList.tsx

import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Animated, FlatList } from "react-native";

import type { EditListItem } from "../../src/components/editList.ts";
import { ReorderList, autoScrollStep, reorderIndexAt } from "../../src/components/ReorderList.tsx";
import { motion } from "../../src/tokens/motion.ts";
import { layout, spacing } from "../../src/tokens/spacing.ts";

const ROW = layout.controlHeight + 2 * spacing.xs;

const timing = jest.spyOn(Animated, "timing");
const scrollToOffset = jest
  .spyOn(FlatList.prototype, "scrollToOffset")
  .mockImplementation(() => undefined);

afterEach(() => {
  timing.mockClear();
  scrollToOffset.mockClear();
  jest.useRealTimers();
});

// A single-touch history the PanResponder reads: the finger moved from `from` to `to` (page y).
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

function call(testID: string, name: string, event?: unknown): unknown {
  const handler: unknown = screen.getByTestId(testID).props[name];
  if (typeof handler !== "function") throw new Error(`no ${name}`);
  return (handler as (event: unknown) => unknown)(event);
}

const item = (n: number): EditListItem => ({
  key: String(n),
  title: `Song ${String(n)}`,
  subtitle: `Artist ${String(n)}`,
  urls: [],
  label: `Song ${String(n)}, Artist ${String(n)}`,
  positionLabel: `${String(n)} of ${String(count)}`,
  removeLabel: `Remove Song ${String(n)}`,
  moveLabel: `Move Song ${String(n)}`,
});

let count = 5;
const itemsOf = (n: number): EditListItem[] => {
  count = n;
  return Array.from({ length: n }, (_unused, index) => item(index + 1));
};

async function setup(options: { count?: number; reduceMotion?: boolean } = {}) {
  const onMove = jest.fn();
  const onRemove = jest.fn();
  await render(
    <ReorderList
      items={itemsOf(options.count ?? 5)}
      onMove={onMove}
      onRemove={onRemove}
      moveUpLabel="Move up"
      moveDownLabel="Move down"
      moveHint="Drag to reorder"
      reduceMotion={options.reduceMotion ?? false}
      bottomInset={0}
      testID="list"
    />,
  );
  return { onMove, onRemove };
}

const grab = (index: number) =>
  act(() => {
    call(`reorder-handle-${String(index)}`, "onResponderGrant", touch(300, 300, 101));
  });
const dragTo = (index: number, dy: number, dt = 16) =>
  act(() => {
    call(`reorder-handle-${String(index)}`, "onResponderMove", touch(300, 300 + dy, 101 + dt, dt));
  });
const release = (index: number, dy: number, dt = 16) =>
  act(() => {
    call(
      `reorder-handle-${String(index)}`,
      "onResponderRelease",
      touch(300, 300 + dy, 101 + dt, dt),
    );
  });

describe("reorderIndexAt", () => {
  it("picks the row under the held row's centre", () => {
    expect(reorderIndexAt(ROW * 2 + 1, ROW, 5)).toBe(2);
    expect(reorderIndexAt(ROW * 3 - 1, ROW, 5)).toBe(2);
  });

  it("clamps above the first and below the last", () => {
    expect(reorderIndexAt(-100, ROW, 5)).toBe(0);
    expect(reorderIndexAt(ROW * 50, ROW, 5)).toBe(4);
  });
});

describe("autoScrollStep", () => {
  it("scrolls up inside the top edge", () => {
    expect(autoScrollStep(motion.reorder.edge - 1, 600, 100)).toBeLessThan(0);
  });

  it("scrolls down inside the bottom edge", () => {
    expect(autoScrollStep(600 - motion.reorder.edge + 1, 600, 100)).toBeGreaterThan(0);
  });

  it("does not scroll in the middle", () => {
    expect(autoScrollStep(300, 600, 100)).toBe(0);
  });

  it("scrolls in proportion to the elapsed time at motion.reorder.speed", () => {
    expect(autoScrollStep(590, 600, 1000)).toBe(motion.reorder.speed);
    expect(autoScrollStep(590, 600, 500)).toBe(motion.reorder.speed / 2);
    expect(autoScrollStep(10, 600, 250)).toBe(-motion.reorder.speed / 4);
  });
});

describe("ReorderList", () => {
  it("calls onRemove with the row's index from its remove button", async () => {
    const { onRemove } = await setup();
    await fireEvent.press(screen.getByLabelText("Remove Song 3"));
    expect(onRemove).toHaveBeenCalledWith(2);
  });

  it("offers move up and move down as accessibility actions, none past the ends", async () => {
    await setup();
    const names = (label: string) =>
      (screen.getByLabelText(label).props.accessibilityActions as { name: string }[]).map(
        (action) => action.name,
      );
    expect(names("Song 1, Artist 1")).toEqual(["moveDown"]);
    expect(names("Song 3, Artist 3")).toEqual(["moveUp", "moveDown"]);
    expect(names("Song 5, Artist 5")).toEqual(["moveUp"]);
  });

  it("calls onMove one place up or down from an accessibility action", async () => {
    const { onMove } = await setup();
    const row = screen.getByLabelText("Song 3, Artist 3");
    await fireEvent(row, "accessibilityAction", { nativeEvent: { actionName: "moveUp" } });
    await fireEvent(row, "accessibilityAction", { nativeEvent: { actionName: "moveDown" } });
    expect(onMove).toHaveBeenNthCalledWith(1, 2, 1);
    expect(onMove).toHaveBeenNthCalledWith(2, 2, 3);
  });

  it("puts the position label in the row's accessibility value and the hint on it", async () => {
    await setup();
    const row = screen.getByLabelText("Song 2, Artist 2");
    expect(row.props.accessibilityValue).toEqual({ text: "2 of 5" });
    expect(row.props.accessibilityHint).toBe("Drag to reorder");
  });

  it("a release two and a bit rows below the handle's row moves it two places", async () => {
    const { onMove } = await setup();
    await grab(0);
    await dragTo(0, ROW * 2.4);
    await release(0, ROW * 2.4);
    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove).toHaveBeenCalledWith(0, 2);
  });

  it("a release above moves the row up", async () => {
    const { onMove } = await setup();
    await grab(3);
    await dragTo(3, -ROW * 2);
    await release(3, -ROW * 2);
    expect(onMove).toHaveBeenCalledWith(3, 1);
  });

  it("a release on its own place moves nothing", async () => {
    const { onMove } = await setup();
    await grab(2);
    await dragTo(2, ROW * 0.3);
    await release(2, ROW * 0.3);
    expect(onMove).not.toHaveBeenCalled();
  });

  it("a terminated drag moves nothing", async () => {
    const { onMove } = await setup();
    await grab(0);
    await dragTo(0, ROW * 3);
    await act(() => {
      call("reorder-handle-0", "onResponderTerminate", touch(300, 300 + ROW * 3, 200));
    });
    expect(onMove).not.toHaveBeenCalled();
  });

  it("the handle keeps the gesture", async () => {
    await setup();
    expect(call("reorder-handle-0", "onResponderTerminationRequest", touch(300, 300, 101))).toBe(
      false,
    );
  });

  it("the list does not scroll while a row is held", async () => {
    await setup();
    const scrolls = () => screen.getByTestId("reorder-scroll").props.scrollEnabled as boolean;
    expect(scrolls()).toBe(true);
    await grab(1);
    expect(scrolls()).toBe(false);
    await release(1, 0);
    expect(scrolls()).toBe(true);
  });

  it("auto-scrolls while the held row is at the bottom edge", async () => {
    jest.useFakeTimers();
    await setup({ count: 30 });
    await fireEvent(screen.getByTestId("list"), "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 400 } },
    });
    await grab(0);
    await dragTo(0, 360);
    await act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(scrollToOffset).toHaveBeenCalled();
    const offsets = scrollToOffset.mock.calls.map((args) => args[0].offset);
    expect(offsets.every((offset) => offset > 0)).toBe(true);
    await release(0, 360);
  });

  it("does not auto-scroll in the middle of the list", async () => {
    jest.useFakeTimers();
    await setup({ count: 30 });
    await fireEvent(screen.getByTestId("list"), "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 400 } },
    });
    await grab(5);
    await dragTo(5, 0);
    await act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(scrollToOffset).not.toHaveBeenCalled();
    await release(5, 0);
  });

  it("makes room with an animation, and without one under reduce motion", async () => {
    await setup();
    await grab(0);
    await dragTo(0, ROW * 2.4);
    expect(timing).toHaveBeenCalled();
    await release(0, ROW * 2.4);
    timing.mockClear();
    scrollToOffset.mockClear();
    await screen.unmount();
    await setup({ reduceMotion: true });
    await grab(0);
    await dragTo(0, ROW * 2.4);
    expect(timing).not.toHaveBeenCalled();
    await release(0, ROW * 2.4);
  });
});

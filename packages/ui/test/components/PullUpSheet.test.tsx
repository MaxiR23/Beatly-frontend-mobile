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
// - the closed panel and the open content hidden from accessibility, the double bounce once, the wash only with a color (the base surface without one), the dominant color at the color.gradient.detailHero stops on iOS and Android over the panel's full height, transparent only at its bottom edge, fading in over motion.duration.base when the color arrives and at once under reduce motion, the handle bar's size and color on iOS and on Android
// - reduce motion (fades instead of movement and scale, no bounce, a bounce under way stopped when it turns on), a live change of it while open leaving the panel and the dim drawn
// - onDragStart on a handle drag, onClosed when the close animation finishes and not when it is cut, or when a cancelled handle drag settles back and not when it commits
//
// Run with: pnpm --filter @beatly/ui test -- PullUpSheet
//
// SEE: packages/ui/src/components/PullUpSheet.tsx

import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Animated, Dimensions, Platform, processColor, Text } from "react-native";

import { PullUpSheet } from "../../src/components/PullUpSheet.tsx";
import { color } from "../../src/tokens/color.ts";
import { motion } from "../../src/tokens/motion.ts";
import { layout } from "../../src/tokens/spacing.ts";

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
const hidden = { includeHiddenElements: true };
const timing = jest.spyOn(Animated, "timing");
const height = Dimensions.get("window").height;

afterEach(() => {
  spring.mockClear();
  timing.mockClear();
  Platform.OS = "ios";
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

interface JsonNode {
  props: Record<string, unknown>;
  children: unknown;
}
const isJsonNode = (value: unknown): value is JsonNode =>
  typeof value === "object" && value !== null && "props" in value;
const find = (tree: unknown, match: (node: JsonNode) => boolean): JsonNode[] => {
  const found: JsonNode[] = [];
  const visit = (node: unknown) => {
    if (Array.isArray(node)) node.forEach(visit);
    if (!isJsonNode(node)) return;
    if (match(node)) found.push(node);
    visit(node.children);
  };
  visit(tree);
  return found;
};
// The svg renderer stores the gradient as [offset, color, ...] with signed ARGB colors.
const rgbOf = (c: string) => (Number(processColor(c)) | 0) & 0xffffff;
// The wash's gradient, scoped to the wash node, parsed into offset, alpha and rgb.
function washStops() {
  const [wash] = find(screen.toJSON(), (node) => node.props.testID === "sheet-wash");
  const [gradient] = find(wash?.children, (node) => "gradient" in node.props);
  const flat = gradient?.props.gradient;
  if (!Array.isArray(flat)) throw new Error("gradient is not an array");
  const stops: { offset: number; alpha: number; rgb: number }[] = [];
  for (let i = 0; i < flat.length; i += 2) {
    const packed = Number(flat[i + 1]);
    stops.push({ offset: Number(flat[i]), alpha: (packed >>> 24) & 0xff, rgb: packed & 0xffffff });
  }
  return { gradient, stops };
}

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

  it("bounces the handle twice and settles it, once, when asked", async () => {
    const { rerender } = await setup({ nudge: true });
    expect(timing).toHaveBeenCalledTimes(3);
    expect(timing.mock.calls.map(([, config]) => config)).toEqual([
      expect.objectContaining({
        toValue: -motion.handleNudge.first,
        duration: motion.duration.fast,
        useNativeDriver: true,
      }),
      expect.objectContaining({ toValue: 0, duration: motion.duration.fast }),
      expect.objectContaining({
        toValue: -motion.handleNudge.second,
        duration: motion.duration.fast,
      }),
    ]);
    expect(spring).toHaveBeenCalledTimes(1);
    expect(spring).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        toValue: 0,
        damping: motion.spring.damping,
        stiffness: motion.spring.stiffness,
      }),
    );
    await rerender({ nudge: true, bodyAtTop: false });
    expect(timing).toHaveBeenCalledTimes(3);
  });

  it("does not nudge when not asked", async () => {
    await setup();
    expect(timing).not.toHaveBeenCalled();
  });

  it("draws the wash gradient only with a color", async () => {
    const { rerender } = await setup();
    expect(screen.queryByTestId("sheet-wash", hidden)).toBeNull();
    expect(gradients()).toBe(0);
    expect(panel()).toHaveStyle({ backgroundColor: color.surface.base });
    await rerender({ washColor: "#336699" });
    expect(screen.getByTestId("sheet-wash", hidden)).toBeTruthy();
    expect(gradients()).toBe(1);
  });

  it.each(["ios", "android"] as const)(
    "draws the color at the detailHero stops on %s",
    async (os) => {
      Platform.OS = os;
      await setup({ washColor: "#336699" });
      const { gradient, stops } = washStops();
      const expected = color.gradient.detailHero.stops;
      expect(stops.map((stop) => stop.offset)).toEqual(expected.map((stop) => stop.offset));
      // Within 1: the mock packs the alpha with its own rounding of the 0.70 stop (178.5).
      stops.forEach((stop, i) => {
        const want = Math.round((expected[i]?.opacity ?? NaN) * 255);
        expect(Math.abs(stop.alpha - want)).toBeLessThanOrEqual(1);
        expect(stop.rgb).toBe(rgbOf("#336699"));
      });
      expect(gradient?.props).toMatchObject({ x2: "0", y2: "1" });
    },
  );

  it("spans the wash over the panel's full height over the base surface, reaching 0 only at the bottom edge", async () => {
    await setup({ washColor: "#336699" });
    expect(panel()).toHaveStyle({
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: color.surface.base,
    });
    expect(screen.getByTestId("sheet-wash", hidden)).toHaveStyle({
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    });
    const { stops } = washStops();
    expect(stops.at(-1)).toMatchObject({ offset: 1, alpha: 0 });
    stops.slice(0, -1).forEach((stop) => {
      expect(stop.alpha).toBeGreaterThan(0);
    });
  });

  it("fades the wash in when its color arrives, and at once under reduce motion", async () => {
    const { rerender } = await setup();
    await rerender({ washColor: "#336699" });
    expect(timing).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        toValue: 1,
        duration: motion.duration.base,
        useNativeDriver: true,
      }),
    );
    timing.mockClear();
    const reduced = await setup({ reduceMotion: true });
    await reduced.rerender({ reduceMotion: true, washColor: "#336699" });
    expect(timing).not.toHaveBeenCalled();
    expect(screen.getAllByTestId("sheet-wash", hidden).at(-1)).toHaveStyle({ opacity: 1 });
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

  it("stops a bounce under way when reduce motion turns on and parks the handle", async () => {
    const stop = jest.fn();
    const sequence = jest.spyOn(Animated, "sequence").mockImplementationOnce(() => ({
      start: () => {
        const lift = timing.mock.calls[0]?.[0];
        if (lift instanceof Animated.Value) lift.setValue(-6);
      },
      stop,
      reset: jest.fn(),
    }));
    const { rerender } = await setup({ nudge: true });
    expect(screen.getByTestId("sheet-handle-bar")).toHaveStyle({ transform: [{ translateY: -6 }] });
    await rerender({ nudge: true, reduceMotion: true });
    expect(stop).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("sheet-handle-bar")).toHaveStyle({ transform: [{ translateY: 0 }] });
    sequence.mockRestore();
  });

  it("draws the dim and, on iOS, the handle bar with today's tokens", async () => {
    await setup();
    expect(screen.getByTestId("sheet-dim")).toHaveStyle({
      backgroundColor: color.overlay.backdrop,
    });
    expect(screen.getByTestId("sheet-handle-bar")).toHaveStyle({
      width: layout.handleWidth,
      height: layout.handleHeight,
      backgroundColor: color.overlay.muted,
    });
  });

  it("draws the handle bar 48 x 5 in white at 45% on Android", async () => {
    Platform.OS = "android";
    await setup();
    expect(screen.getByTestId("sheet-handle-bar")).toHaveStyle({
      width: layout.handleWidthAndroid,
      height: layout.handleHeightAndroid,
      backgroundColor: color.overlay.handleAndroid,
    });
    expect(layout.handleWidthAndroid).toBe(48);
    expect(layout.handleHeightAndroid).toBe(5);
    expect(color.overlay.handleAndroid).toBe("rgba(255, 255, 255, 0.45)");
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

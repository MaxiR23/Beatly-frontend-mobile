// packages/ui/test/components/Sheet.test.tsx
//
// Tests for the Sheet.
//
// Tested:
// - Sheet
//
// What is covered:
// - visible draws its children, the backdrop closes it, hidden draws nothing
// - iOS: the glass sheet attached to the bottom and side edges (no bottom or side padding or margin up to the Modal), radius.xl top corners and square bottom ones, the content the bottom inset above the edge, with and without native glass, and no handle
// - iOS and Android: the backdrop and the sheet inside a transparent Modal presented over the whole window
// - iOS and Android: the open (backdrop fading in place, only the sheet sliding up from the window height, motion.duration.slow and motion.easing.enter on the native driver) and the close (fading out, sliding down, motion.duration.base and motion.easing.exit, the Modal kept until the slide ends, then onClosed once), a reopen during the close, no touches (and no system back) while it closes, a sheet mounted hidden, the backdrop close fading the backdrop
// - iOS and Android under reduce motion: open and close at once with no timing, also when it turns on during a close
// - Android: the attached surface with radius.xl top corners on the raised fill, the handle and its zone, the bottom inset and the content padding
// - Android: the drag from the handle zone that closes (distance, flick, once) and the one that springs back, a reopen starting in place
// - Android: the scrim and the system back closing it, reduce motion (no movement, still closes), a drag close continuing down from the finger with the backdrop fading, and no drag during the close
//
// Run with: pnpm --filter @beatly/ui test -- Sheet
//
// SEE: packages/ui/src/components/Sheet.tsx

import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import {
  Animated,
  Button,
  Dimensions,
  Easing,
  Platform,
  Text,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { Sheet } from "../../src/components/Sheet.tsx";
import { color } from "../../src/tokens/color.ts";
import { motion } from "../../src/tokens/motion.ts";
import { radius } from "../../src/tokens/radius.ts";
import { layout, spacing } from "../../src/tokens/spacing.ts";
import { flatStyle } from "../helpers/flatStyle.ts";

// A single-touch history the PanResponder reads, as DragToClose.test.tsx does.
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
  const handler: unknown = screen.getByTestId("sheet-handle-zone").props[name];
  if (typeof handler !== "function") throw new Error(`no ${name}`);
  return (handler as (event: unknown) => unknown)(event);
}

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

const spring = jest.spyOn(Animated, "spring");
const realTiming = Animated.timing;
const timing = jest.spyOn(Animated, "timing");
const bezier = jest.spyOn(Easing, "bezier");
const height = Dimensions.get("window").height;

function flat(testID: string): ViewStyle {
  return flatStyle(screen.getByTestId(testID).props.style as StyleProp<ViewStyle>);
}

afterEach(() => {
  Platform.OS = "ios";
  mockGlass.available = false;
  spring.mockClear();
  // mockReset drops the held implementation and, in this Jest, does not call through again.
  timing.mockReset();
  timing.mockImplementation(realTiming);
  bezier.mockClear();
});

interface HeldTiming {
  config: Animated.TimingAnimationConfig;
  done?: ((result: { finished: boolean }) => void) | undefined;
}

// Holds every Animated.timing until the test ends it; returns the configs and the start callbacks in call order.
function holdTimings() {
  const held: HeldTiming[] = [];
  timing.mockImplementation((_value, config) => {
    const entry: HeldTiming = { config };
    held.push(entry);
    return {
      start: (done?: HeldTiming["done"]) => {
        entry.done = done;
      },
      stop: jest.fn(),
      reset: jest.fn(),
    };
  });
  return held;
}

const end = (entry: HeldTiming | undefined, finished = true) =>
  act(() => {
    entry?.done?.({ finished });
  });

// Every key that would put a bottom or side margin between the iOS sheet and the window's edges.
const edgeKeys = [
  "padding",
  "paddingHorizontal",
  "paddingVertical",
  "paddingBottom",
  "paddingLeft",
  "paddingRight",
  "paddingStart",
  "paddingEnd",
  "margin",
  "marginHorizontal",
  "marginVertical",
  "marginBottom",
  "marginLeft",
  "marginRight",
  "marginStart",
  "marginEnd",
] as const;

interface ReactNativeView {
  View: unknown;
}

const mockGlass = { available: false };
jest.mock("expo-glass-effect", () => {
  const { View } = jest.requireActual<ReactNativeView>("react-native");
  return {
    GlassView: View,
    isLiquidGlassAvailable: () => mockGlass.available,
    isGlassEffectAPIAvailable: () => mockGlass.available,
  };
});

describe("Sheet", () => {
  it("draws its children when visible", async () => {
    await render(
      <Sheet visible onClose={jest.fn()} closeLabel="Close" bottomInset={0} reduceMotion={false}>
        <Text>inside</Text>
      </Sheet>,
    );
    expect(screen.getByText("inside")).toBeTruthy();
  });

  it("calls onClose when the backdrop is pressed", async () => {
    const onClose = jest.fn();
    await render(
      <Sheet visible onClose={onClose} closeLabel="Close" bottomInset={0} reduceMotion={false}>
        <Text>inside</Text>
      </Sheet>,
    );
    await fireEvent.press(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps a child button reachable and its press does not close the sheet", async () => {
    const onClose = jest.fn();
    const onChild = jest.fn();
    await render(
      <Sheet visible onClose={onClose} closeLabel="Close" bottomInset={0} reduceMotion={false}>
        <Button title="Log out" onPress={onChild} />
      </Sheet>,
    );
    await fireEvent.press(screen.getByRole("button", { name: "Log out" }));
    expect(onChild).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not close when plain content is pressed", async () => {
    const onClose = jest.fn();
    await render(
      <Sheet visible onClose={onClose} closeLabel="Close" bottomInset={0} reduceMotion={false}>
        <Text>inside</Text>
      </Sheet>,
    );
    await fireEvent.press(screen.getByText("inside"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("draws nothing when not visible", async () => {
    await render(
      <Sheet
        visible={false}
        onClose={jest.fn()}
        closeLabel="Close"
        bottomInset={0}
        reduceMotion={false}
      >
        <Text>inside</Text>
      </Sheet>,
    );
    expect(screen.queryByText("inside")).toBeNull();
  });

  it.each([false, true])(
    "on iOS (glass %s) attaches the glass sheet to the bottom and side edges with only its top corners rounded, keeps the content above the bottom inset",
    async (glass) => {
      mockGlass.available = glass;
      await render(
        <Sheet visible onClose={jest.fn()} closeLabel="Close" bottomInset={34} reduceMotion>
          <Text>inside</Text>
        </Sheet>,
      );
      expect(screen.queryByTestId("sheet-handle")).toBeNull();
      expect(screen.getByTestId("sheet-modal").props.animationType).toBe("none");
      const surface = flat("sheet-surface");
      expect(surface).toMatchObject({
        alignSelf: "stretch",
        borderRadius: radius.xl,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        padding: spacing.xl,
      });
      for (const key of edgeKeys.filter((k) => k.startsWith("margin"))) {
        expect({ key, value: surface[key] ?? 0 }).toEqual({ key, value: 0 });
      }
      expect(flat("sheet-content").paddingBottom).toBe(34);
      expect(flat("sheet-content").gap).toBe(spacing.lg);
      expect(flat("sheet-frame").paddingTop).toBe(layout.gutter);
      for (
        let node = screen.getByTestId("sheet-surface").parent;
        node !== null && node.props.testID !== "sheet-modal";
        node = node.parent
      ) {
        const style = flatStyle(node.props.style as StyleProp<ViewStyle>);
        for (const key of edgeKeys) {
          expect({ key, value: style[key] ?? 0 }).toEqual({ key, value: 0 });
        }
      }
    },
  );
});

describe.each(["ios", "android"] as const)("Sheet on %s", (os) => {
  it("draws the backdrop and the sheet inside a transparent Modal presented over the whole window", async () => {
    Platform.OS = os;
    await render(
      <Sheet visible onClose={jest.fn()} closeLabel="Close" bottomInset={34} reduceMotion={false}>
        <Text>inside</Text>
      </Sheet>,
    );
    const modal = screen.getByTestId("sheet-modal");
    expect(modal.props.transparent).toBe(true);
    expect(modal.props.presentationStyle).toBeUndefined();
    const insideModal = (start: { parent: unknown }) => {
      for (let node = start.parent as typeof modal | null; node !== null; node = node.parent) {
        if (node.props.testID === "sheet-modal") return true;
      }
      return false;
    };
    expect(insideModal(screen.getByRole("button", { name: "Close" }))).toBe(true);
    expect(insideModal(screen.getByTestId(os === "ios" ? "sheet-frame" : "sheet-surface"))).toBe(
      true,
    );
  });
});

describe.each(["ios", "android"] as const)("Sheet motion on %s", (os) => {
  const slider = os === "ios" ? "sheet-frame" : "sheet-surface";
  const element = (
    visible: boolean,
    options: { reduceMotion?: boolean; onClose?: () => void; onClosed?: () => void } = {},
  ) => (
    <Sheet
      visible={visible}
      onClose={options.onClose ?? jest.fn()}
      onClosed={options.onClosed}
      closeLabel="Close"
      bottomInset={0}
      reduceMotion={options.reduceMotion ?? false}
    >
      <Text>inside</Text>
    </Sheet>
  );

  it("opens with the backdrop fading in place and only the sheet sliding up from the bottom edge", async () => {
    Platform.OS = os;
    const held = holdTimings();
    await render(element(true));
    expect(screen.getByTestId("sheet-modal").props.animationType).toBe("none");
    expect(held).toHaveLength(2);
    expect(held[0]?.config).toEqual(
      expect.objectContaining({
        toValue: 1,
        duration: motion.duration.slow,
        useNativeDriver: true,
        easing: bezier.mock.results[0]?.value,
      }),
    );
    expect(held[1]?.config).toEqual(
      expect.objectContaining({
        toValue: 0,
        duration: motion.duration.slow,
        useNativeDriver: true,
        easing: bezier.mock.results[0]?.value,
      }),
    );
    expect(bezier).toHaveBeenCalledWith(...motion.easing.enter);
    expect(flat("sheet-backdrop").opacity).toBe(0);
    expect(flat("sheet-backdrop")).not.toHaveProperty("transform");
    expect(flat(slider).transform).toEqual([{ translateY: height }]);
    for (
      let node = screen.getByTestId("sheet-backdrop").parent;
      node !== null && node.props.testID !== "sheet-modal";
      node = node.parent
    ) {
      expect(node.props.testID).not.toBe(slider);
    }
  });

  it("closes with the backdrop fading out in place and the sheet sliding down, then drops the Modal and calls onClosed once", async () => {
    Platform.OS = os;
    const held = holdTimings();
    const onClosed = jest.fn();
    const view = await render(element(true, { onClosed }));
    await end(held[0]);
    await end(held[1]);
    await view.rerender(element(false, { onClosed }));
    expect(held).toHaveLength(4);
    expect(held[2]?.config).toEqual(
      expect.objectContaining({
        toValue: 0,
        duration: motion.duration.base,
        useNativeDriver: true,
      }),
    );
    expect(held[3]?.config).toEqual(
      expect.objectContaining({
        toValue: height,
        duration: motion.duration.base,
        useNativeDriver: true,
      }),
    );
    expect(bezier).toHaveBeenLastCalledWith(...motion.easing.exit);
    expect(screen.getByText("inside")).toBeTruthy();
    expect(onClosed).not.toHaveBeenCalled();
    await end(held[3]);
    expect(screen.queryByText("inside")).toBeNull();
    expect(onClosed).toHaveBeenCalledTimes(1);
  });

  it("a reopen during the close keeps the Modal and does not call onClosed", async () => {
    Platform.OS = os;
    const held = holdTimings();
    const onClosed = jest.fn();
    const view = await render(element(true, { onClosed }));
    await view.rerender(element(false, { onClosed }));
    await view.rerender(element(true, { onClosed }));
    expect(held).toHaveLength(6);
    expect(held[4]?.config).toEqual(
      expect.objectContaining({ toValue: 1, duration: motion.duration.slow }),
    );
    expect(held[5]?.config).toEqual(
      expect.objectContaining({ toValue: 0, duration: motion.duration.slow }),
    );
    await end(held[3], false);
    expect(screen.getByText("inside")).toBeTruthy();
    expect(onClosed).not.toHaveBeenCalled();
  });

  it("takes no touches while it closes, and takes them again on a reopen", async () => {
    Platform.OS = os;
    holdTimings();
    const onClose = jest.fn();
    const view = await render(element(true, { onClose }));
    expect(screen.getByTestId("sheet-container").props.pointerEvents).toBe("auto");
    await view.rerender(element(false, { onClose }));
    expect(screen.getByTestId("sheet-container").props.pointerEvents).toBe("none");
    expect(screen.getByTestId("sheet-modal").props.onRequestClose).toBeUndefined();
    await view.rerender(element(true, { onClose }));
    expect(screen.getByTestId("sheet-container").props.pointerEvents).toBe("auto");
    expect(screen.getByTestId("sheet-modal").props.onRequestClose).toBe(onClose);
  });

  it("under reduce motion opens and closes at once, with no timing", async () => {
    Platform.OS = os;
    const onClosed = jest.fn();
    const view = await render(element(true, { reduceMotion: true, onClosed }));
    expect(timing).not.toHaveBeenCalled();
    expect(flat("sheet-backdrop").opacity).toBe(1);
    expect(flat(slider).transform).toEqual([{ translateY: 0 }]);
    await view.rerender(element(false, { reduceMotion: true, onClosed }));
    expect(timing).not.toHaveBeenCalled();
    expect(screen.queryByText("inside")).toBeNull();
    expect(onClosed).toHaveBeenCalledTimes(1);
  });

  it("reduce motion turning on during the close ends it at once", async () => {
    Platform.OS = os;
    const held = holdTimings();
    const onClosed = jest.fn();
    const view = await render(element(true, { onClosed }));
    await end(held[0]);
    await end(held[1]);
    await view.rerender(element(false, { onClosed }));
    expect(screen.getByText("inside")).toBeTruthy();
    await view.rerender(element(false, { reduceMotion: true, onClosed }));
    expect(screen.queryByText("inside")).toBeNull();
    expect(onClosed).toHaveBeenCalledTimes(1);
  });

  it("mounted hidden it neither animates nor calls onClosed", async () => {
    Platform.OS = os;
    const onClosed = jest.fn();
    await render(element(false, { onClosed }));
    expect(timing).not.toHaveBeenCalled();
    expect(onClosed).not.toHaveBeenCalled();
  });

  it("the backdrop press asks to close, and the close that follows fades the backdrop", async () => {
    Platform.OS = os;
    const held = holdTimings();
    const onClose = jest.fn();
    const view = await render(element(true, { onClose }));
    await fireEvent.press(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    await view.rerender(element(false, { onClose }));
    expect(held[2]?.config).toEqual(
      expect.objectContaining({ toValue: 0, duration: motion.duration.base }),
    );
  });
});

describe("Sheet on Android", () => {
  async function setup(options: { reduceMotion?: boolean; bottomInset?: number } = {}) {
    Platform.OS = "android";
    const onClose = jest.fn();
    const element = (visible: boolean) => (
      <Sheet
        visible={visible}
        onClose={onClose}
        closeLabel="Close"
        bottomInset={options.bottomInset ?? 0}
        reduceMotion={options.reduceMotion ?? false}
      >
        <Text>inside</Text>
      </Sheet>
    );
    const view = await render(element(true));
    return { onClose, view, element };
  }

  it("draws an attached surface with only the top corners rounded on the raised fill", async () => {
    await setup();
    const surface = flat("sheet-surface");
    expect(surface.borderTopLeftRadius).toBe(radius.xl);
    expect(surface.borderTopRightRadius).toBe(radius.xl);
    expect(surface.backgroundColor).toBe(color.surface.raised);
    expect(surface).not.toHaveProperty("borderBottomLeftRadius");
    expect(surface).not.toHaveProperty("borderBottomRightRadius");
    expect(surface).not.toHaveProperty("borderRadius");
    expect(surface).not.toHaveProperty("borderWidth");
    const frame = flatStyle(
      screen.getByTestId("sheet-surface").parent?.props.style as StyleProp<ViewStyle>,
    );
    expect(frame).not.toHaveProperty("paddingHorizontal");
    expect(frame).not.toHaveProperty("padding");
    expect(frame).not.toHaveProperty("paddingBottom");
  });

  it("draws the handle in its zone", async () => {
    await setup();
    expect(flat("sheet-handle")).toMatchObject({
      width: layout.modalHandleWidthAndroid,
      height: layout.handleHeight,
      borderRadius: radius.full,
      backgroundColor: color.overlay.handleAndroid,
    });
    expect(flat("sheet-handle-zone")).toMatchObject({
      height: layout.modalHandleZoneAndroid,
      alignItems: "center",
      justifyContent: "center",
    });
  });

  it("keeps the content above the bottom inset with the side padding the action rows bleed through", async () => {
    await setup({ bottomInset: 34 });
    expect(flat("sheet-surface").paddingBottom).toBe(34 + spacing.xl);
    expect(flat("sheet-content").paddingHorizontal).toBe(spacing.xl);
  });

  it("closes once when released past the distance share, and takes no more drags", async () => {
    const { onClose } = await setup();
    const distance = height * motion.dragToClose.distanceShare + 1;
    await drag(distance);
    await release(distance);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(spring).not.toHaveBeenCalled();
    expect(call("onMoveShouldSetResponderCapture", touch(0, 50, 9000))).toBe(false);
  });

  it("closes on a fast downward flick short of the distance", async () => {
    const { onClose } = await setup();
    await drag(40, 20);
    await release(40, 20);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("follows the finger and springs back when released early", async () => {
    // A held open leaves the value to the drag, as the native driver does once it has ended.
    holdTimings();
    const { onClose } = await setup();
    await drag(100);
    expect(flat("sheet-surface").transform).toEqual([{ translateY: 100 }]);
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

  it("starts in place and takes a drag again when reopened after a close", async () => {
    const { view, element } = await setup();
    const distance = height * motion.dragToClose.distanceShare + 1;
    await drag(distance);
    await release(distance);
    await view.rerender(element(false));
    await view.rerender(element(true));
    expect(timing).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: 0, duration: motion.duration.slow }),
    );
    await act(() => {
      call("onStartShouldSetResponderCapture", touch(0, 0, 20000));
    });
    expect(call("onMoveShouldSetResponderCapture", touch(0, 50, 20010))).toBe(true);
  });

  it("closes from the scrim and from the system back action", async () => {
    const { onClose } = await setup();
    await fireEvent.press(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    const onRequestClose: unknown = screen.getByTestId("sheet-modal").props.onRequestClose;
    if (typeof onRequestClose !== "function") throw new Error("no onRequestClose");
    await act(() => {
      (onRequestClose as () => void)();
    });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("the Modal never animates, under reduce motion either", async () => {
    const first = await setup();
    expect(screen.getByTestId("sheet-modal").props.animationType).toBe("none");
    await first.view.unmount();
    await setup({ reduceMotion: true });
    expect(screen.getByTestId("sheet-modal").props.animationType).toBe("none");
  });

  it("after a drag closes it, the close continues down from the finger and the backdrop fades", async () => {
    const held = holdTimings();
    const onClosed = jest.fn();
    const { onClose, view } = await setup();
    await end(held[0]);
    await end(held[1]);
    const distance = height * motion.dragToClose.distanceShare + 1;
    await drag(distance);
    await release(distance);
    expect(onClose).toHaveBeenCalledTimes(1);
    await view.rerender(
      <Sheet
        visible={false}
        onClose={onClose}
        onClosed={onClosed}
        closeLabel="Close"
        bottomInset={0}
        reduceMotion={false}
      >
        <Text>inside</Text>
      </Sheet>,
    );
    expect(held[2]?.config).toEqual(expect.objectContaining({ toValue: 0 }));
    expect(held[3]?.config).toEqual(expect.objectContaining({ toValue: height }));
    expect(flat("sheet-surface").transform).toEqual([{ translateY: distance }]);
    await end(held[3]);
    expect(onClosed).toHaveBeenCalledTimes(1);
  });

  it("takes no drag while it closes", async () => {
    holdTimings();
    const { view, element } = await setup();
    await view.rerender(element(false));
    expect(call("onMoveShouldSetResponderCapture", touch(0, 50, 9000))).toBe(false);
  });

  it("under reduce motion, stays still while dragging and still closes past the distance", async () => {
    const { onClose } = await setup({ reduceMotion: true });
    await drag(100);
    expect(flat("sheet-surface").transform).toEqual([{ translateY: 0 }]);
    await release(100);
    expect(onClose).not.toHaveBeenCalled();
    const distance = height * motion.dragToClose.distanceShare + 1;
    await drag(distance);
    await release(distance);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

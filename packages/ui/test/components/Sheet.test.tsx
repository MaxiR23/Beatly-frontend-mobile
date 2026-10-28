// packages/ui/test/components/Sheet.test.tsx
//
// Tests for the Sheet.
//
// Tested:
// - Sheet
//
// What is covered:
// - visible draws its children, the backdrop closes it, hidden draws nothing
// - iOS: today's glass sheet with no handle, and the slide animation whatever reduce motion says
// - Android: the attached surface with radius.xl top corners on the raised fill, the handle and its zone, the bottom inset and the content padding
// - Android: the drag from the handle zone that closes (distance, flick, once) and the one that springs back, a reopen starting in place
// - Android: the scrim and the system back closing it, and reduce motion (no animation, no movement, still closes)
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
const height = Dimensions.get("window").height;

function flat(testID: string): ViewStyle {
  return flatStyle(screen.getByTestId(testID).props.style as StyleProp<ViewStyle>);
}

afterEach(() => {
  Platform.OS = "ios";
  spring.mockClear();
});

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

  it("on iOS draws today's glass sheet with no handle and slides whatever reduce motion says", async () => {
    await render(
      <Sheet visible onClose={jest.fn()} closeLabel="Close" bottomInset={34} reduceMotion>
        <Text>inside</Text>
      </Sheet>,
    );
    expect(screen.queryByTestId("sheet-handle")).toBeNull();
    expect(screen.getByTestId("sheet-modal").props.animationType).toBe("slide");
    const styles: ViewStyle[] = [];
    for (let node = screen.getByText("inside").parent; node !== null; node = node.parent) {
      styles.push(flatStyle(node.props.style as StyleProp<ViewStyle>));
    }
    expect(styles).toContainEqual(
      expect.objectContaining({ borderRadius: radius.lg, padding: spacing.xl }),
    );
    expect(styles).toContainEqual(
      expect.objectContaining({
        padding: layout.gutter,
        paddingBottom: 34 + layout.gutter,
        paddingTop: layout.gutter,
      }),
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
    expect(flat("sheet-surface").transform).toEqual([{ translateY: 0 }]);
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

  it("animates the slide, and under reduce motion does not", async () => {
    const first = await setup();
    expect(screen.getByTestId("sheet-modal").props.animationType).toBe("slide");
    await first.view.unmount();
    await setup({ reduceMotion: true });
    expect(screen.getByTestId("sheet-modal").props.animationType).toBe("none");
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

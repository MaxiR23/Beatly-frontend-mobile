// packages/ui/test/components/NativeMenu.test.tsx
//
// Tests for the NativeMenu.
//
// Tested:
// - NativeMenu
// - isNativeMenuAvailable
//
// What is covered:
// - available on iOS when the ExpoUI module exists, not without the module, not on Android
// - one button per item that calls onSelect, a destructive item marked with its role
// - the Host seed color is the primary text color, not the system accent
// - the label carries the controlHeight frame and the rectangle content shape, so the whole square opens the menu
// - the Host keeps its layout.controlHeight square (no matchContents, so it never shrinks to the ellipsis) and centers its content
//
// Run with: pnpm --filter @beatly/ui test -- NativeMenu
//
// SEE: packages/ui/src/components/NativeMenu.tsx

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Platform, StyleSheet } from "react-native";

import { color } from "../../src/tokens/color.ts";
import { layout } from "../../src/tokens/spacing.ts";
import { NativeMenu, isNativeMenuAvailable } from "../../src/components/NativeMenu.tsx";

interface ReactNativeParts {
  Pressable: unknown;
  Text: unknown;
  View: unknown;
}

const mockNative: { module: object | null } = { module: {} };
const mockImage: { modifiers: unknown } = { modifiers: undefined };
const mockHost: { props: Record<string, unknown> } = { props: {} };

jest.mock("expo", () => ({ requireOptionalNativeModule: () => mockNative.module }));
jest.mock("@expo/ui/swift-ui", () => {
  const { Pressable, Text, View } = jest.requireActual<ReactNativeParts>("react-native") as {
    Pressable: React.ComponentType<Record<string, unknown>>;
    Text: React.ComponentType<Record<string, unknown>>;
    View: React.ComponentType<Record<string, unknown>>;
  };
  return {
    Host: (props: { children?: React.ReactNode; seedColor?: string } & Record<string, unknown>) => {
      mockHost.props = props;
      return (
        <View testID="host" accessibilityHint={props.seedColor}>
          {props.children}
        </View>
      );
    },
    Menu: ({ children, label }: { children?: React.ReactNode; label?: React.ReactNode }) => (
      <View>
        {label}
        {children}
      </View>
    ),
    Image: (props: { modifiers?: unknown }) => {
      mockImage.modifiers = props.modifiers;
      return null;
    },
    Button: ({ label, role, onPress }: { label: string; role: string; onPress: () => void }) => (
      <Pressable accessibilityRole="button" accessibilityHint={role} onPress={onPress}>
        <Text>{label}</Text>
      </Pressable>
    ),
  };
});
jest.mock("@expo/ui/swift-ui/modifiers", () => ({
  accessibilityLabel: (label: string) => ({ accessibilityLabel: label }),
  frame: (params: object) => ({ type: "frame", ...params }),
  contentShape: (shape: object) => ({ type: "contentShape", shape }),
  shapes: { rectangle: () => ({ type: "rectangle" }) },
}));

beforeEach(() => {
  mockNative.module = {};
  mockHost.props = {};
  mockImage.modifiers = undefined;
  Platform.OS = "ios";
});

describe("isNativeMenuAvailable", () => {
  it("is available on iOS when the ExpoUI module exists", () => {
    expect(isNativeMenuAvailable()).toBe(true);
  });

  it("is not available without the module", () => {
    mockNative.module = null;
    expect(isNativeMenuAvailable()).toBe(false);
  });

  it("is not available on Android", () => {
    Platform.OS = "android";
    expect(isNativeMenuAvailable()).toBe(false);
  });
});

describe("NativeMenu", () => {
  it("renders one button per item and calls onSelect", async () => {
    const onLike = jest.fn();
    await render(
      <NativeMenu
        accessibilityLabel="More"
        items={[
          { key: "like", label: "Like", icon: "heart", onSelect: onLike },
          { key: "credits", label: "Credits", icon: "info", onSelect: jest.fn() },
        ]}
      />,
    );
    expect(screen.getAllByRole("button")).toHaveLength(2);
    await fireEvent.press(screen.getByRole("button", { name: "Like" }));
    expect(onLike).toHaveBeenCalledTimes(1);
  });

  it("seeds the Host with the primary text color, not the system accent", async () => {
    await render(
      <NativeMenu
        accessibilityLabel="More"
        items={[{ key: "like", label: "Like", icon: "heart", onSelect: jest.fn() }]}
      />,
    );
    expect(screen.getByTestId("host").props.accessibilityHint).toBe(color.text.primary);
  });

  it("keeps the Host at the layout.controlHeight square instead of the content's size", async () => {
    await render(
      <NativeMenu
        accessibilityLabel="More"
        items={[{ key: "like", label: "Like", icon: "heart", onSelect: jest.fn() }]}
      />,
    );
    expect(mockHost.props).not.toHaveProperty("matchContents");
    expect(StyleSheet.flatten(mockHost.props.style as object)).toEqual({
      width: layout.controlHeight,
      height: layout.controlHeight,
    });
  });

  it("makes the whole control-height square the trigger, not only the glyph", async () => {
    await render(
      <NativeMenu
        accessibilityLabel="More"
        items={[{ key: "like", label: "Like", icon: "heart", onSelect: jest.fn() }]}
      />,
    );
    expect(mockImage.modifiers).toEqual([
      { type: "frame", width: layout.controlHeight, height: layout.controlHeight },
      { type: "contentShape", shape: { type: "rectangle" } },
    ]);
  });

  it("centers the ellipsis in the Host", async () => {
    await render(
      <NativeMenu
        accessibilityLabel="More"
        items={[{ key: "like", label: "Like", icon: "heart", onSelect: jest.fn() }]}
      />,
    );
    expect(mockHost.props.alignment).toBe("center");
  });

  it("marks a destructive item", async () => {
    await render(
      <NativeMenu
        accessibilityLabel="More"
        items={[
          { key: "remove", label: "Remove", icon: "x", destructive: true, onSelect: jest.fn() },
          { key: "like", label: "Like", icon: "heart", onSelect: jest.fn() },
        ]}
      />,
    );
    expect(screen.getByRole("button", { name: "Remove" }).props.accessibilityHint).toBe(
      "destructive",
    );
    expect(screen.getByRole("button", { name: "Like" }).props.accessibilityHint).toBe("default");
  });
});

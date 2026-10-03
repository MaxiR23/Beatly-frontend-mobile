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
//
// Run with: pnpm --filter @beatly/ui test -- NativeMenu
//
// SEE: packages/ui/src/components/NativeMenu.tsx

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Platform } from "react-native";

import { color } from "../../src/tokens/color.ts";
import { NativeMenu, isNativeMenuAvailable } from "../../src/components/NativeMenu.tsx";

interface ReactNativeParts {
  Pressable: unknown;
  Text: unknown;
  View: unknown;
}

const mockNative: { module: object | null } = { module: {} };

jest.mock("expo", () => ({ requireOptionalNativeModule: () => mockNative.module }));
jest.mock("@expo/ui/swift-ui", () => {
  const { Pressable, Text, View } = jest.requireActual<ReactNativeParts>("react-native") as {
    Pressable: React.ComponentType<Record<string, unknown>>;
    Text: React.ComponentType<Record<string, unknown>>;
    View: React.ComponentType<Record<string, unknown>>;
  };
  const passthrough = ({ children }: { children?: React.ReactNode }) => <View>{children}</View>;
  return {
    Host: ({ children, seedColor }: { children?: React.ReactNode; seedColor?: string }) => (
      <View testID="host" accessibilityHint={seedColor}>
        {children}
      </View>
    ),
    Menu: passthrough,
    Image: () => null,
    Button: ({ label, role, onPress }: { label: string; role: string; onPress: () => void }) => (
      <Pressable accessibilityRole="button" accessibilityHint={role} onPress={onPress}>
        <Text>{label}</Text>
      </Pressable>
    ),
  };
});
jest.mock("@expo/ui/swift-ui/modifiers", () => ({
  accessibilityLabel: (label: string) => ({ accessibilityLabel: label }),
}));

beforeEach(() => {
  mockNative.module = {};
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

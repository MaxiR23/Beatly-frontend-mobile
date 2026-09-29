// packages/ui/test/components/Sheet.test.tsx
//
// Tests for the Sheet.
//
// Tested:
// - Sheet
//
// What is covered:
// - visible draws its children, the backdrop closes it, hidden draws nothing
//
// Run with: pnpm --filter @beatly/ui test -- Sheet
//
// SEE: packages/ui/src/components/Sheet.tsx

import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Button, Text } from "react-native";

import { Sheet } from "../../src/components/Sheet.tsx";

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
      <Sheet visible onClose={jest.fn()} closeLabel="Close" bottomInset={0}>
        <Text>inside</Text>
      </Sheet>,
    );
    expect(screen.getByText("inside")).toBeTruthy();
  });

  it("calls onClose when the backdrop is pressed", async () => {
    const onClose = jest.fn();
    await render(
      <Sheet visible onClose={onClose} closeLabel="Close" bottomInset={0}>
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
      <Sheet visible onClose={onClose} closeLabel="Close" bottomInset={0}>
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
      <Sheet visible onClose={onClose} closeLabel="Close" bottomInset={0}>
        <Text>inside</Text>
      </Sheet>,
    );
    await fireEvent.press(screen.getByText("inside"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("draws nothing when not visible", async () => {
    await render(
      <Sheet visible={false} onClose={jest.fn()} closeLabel="Close" bottomInset={0}>
        <Text>inside</Text>
      </Sheet>,
    );
    expect(screen.queryByText("inside")).toBeNull();
  });
});

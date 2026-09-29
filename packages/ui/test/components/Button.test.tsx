// packages/ui/test/components/Button.test.tsx
//
// Tests for the Button's press, disabled and loading behavior.
//
// Tested:
// - Button
//
// What is covered:
// - onPress fires on a press, and does not fire while disabled or loading
// - Loading swaps the label for a spinner but keeps the accessible name
//
// Run with: pnpm --filter @beatly/ui test -- Button
//
// SEE: packages/ui/src/components/Button.tsx

import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { Button } from "../../src/components/Button.tsx";

describe("Button", () => {
  it("calls onPress when pressed", async () => {
    const onPress = jest.fn();
    await render(<Button label="Go" onPress={onPress} />);

    await fireEvent.press(screen.getByRole("button", { name: "Go" }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does not call onPress when disabled", async () => {
    const onPress = jest.fn();
    await render(<Button label="Go" onPress={onPress} disabled />);

    const button = screen.getByRole("button", { name: "Go" });
    await fireEvent.press(button);

    expect(button.props.accessibilityState).toMatchObject({ disabled: true });
    expect(onPress).not.toHaveBeenCalled();
  });

  it("shows a spinner instead of the label and ignores presses while loading", async () => {
    const onPress = jest.fn();
    await render(<Button label="Go" onPress={onPress} loading />);

    const button = screen.getByRole("button", { name: "Go" });
    await fireEvent.press(button);

    expect(screen.queryByText("Go")).toBeNull();
    expect(button.props.accessibilityState).toMatchObject({ busy: true });
    expect(onPress).not.toHaveBeenCalled();
  });
});

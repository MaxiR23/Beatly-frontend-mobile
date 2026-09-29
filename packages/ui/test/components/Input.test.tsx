// packages/ui/test/components/Input.test.tsx
//
// Tests for the Input's eye button.
//
// Tested:
// - Input
//
// What is covered:
// - With reveal, the entry starts hidden, the eye shows it and hides it again, and its label follows the state
// - Without reveal there is no eye button and secureTextEntry passes through
//
// Run with: pnpm --filter @beatly/ui test -- Input
//
// SEE: packages/ui/src/components/Input.tsx

import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { Input } from "../../src/components/Input.tsx";

const reveal = { show: "Show", hide: "Hide" };

describe("Input", () => {
  it("starts hidden and shows the entry when the eye is pressed", async () => {
    await render(<Input label="Password" value="x" onChangeText={jest.fn()} reveal={reveal} />);
    expect(screen.getByLabelText("Password").props.secureTextEntry).toBe(true);

    await fireEvent.press(screen.getByRole("button", { name: "Show" }));

    expect(screen.getByLabelText("Password").props.secureTextEntry).toBe(false);
    expect(screen.getByRole("button", { name: "Hide" })).toBeTruthy();
  });

  it("hides the entry again on a second press", async () => {
    await render(<Input label="Password" value="x" onChangeText={jest.fn()} reveal={reveal} />);
    await fireEvent.press(screen.getByRole("button", { name: "Show" }));
    await fireEvent.press(screen.getByRole("button", { name: "Hide" }));
    expect(screen.getByLabelText("Password").props.secureTextEntry).toBe(true);
  });

  it("draws no eye button without reveal", async () => {
    await render(<Input label="Password" value="x" onChangeText={jest.fn()} secureTextEntry />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByLabelText("Password").props.secureTextEntry).toBe(true);
  });
});

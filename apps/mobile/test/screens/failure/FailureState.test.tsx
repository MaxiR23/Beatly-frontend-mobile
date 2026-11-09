// apps/mobile/test/screens/failure/FailureState.test.tsx
//
// Tests for the FailureState.
//
// Tested:
// - FailureState
//
// What is covered:
// - each cause draws its title and explanation in en and Retry calling onRetry
// - a message replaces the cause's explanation and keeps its title
//
// Run with: pnpm --filter @beatly/mobile test -- FailureState
//
// SEE: apps/mobile/src/screens/failure/FailureState.tsx

import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { resources } from "../../../src/i18n/resources.ts";
import { FailureState } from "../../../src/screens/failure/FailureState.tsx";

const en = resources.en.common;

describe("FailureState", () => {
  it.each([
    ["offline", en.error.offline],
    ["slow", en.error.slow],
    ["server", en.error.server],
  ] as const)("draws the %s cause with its copy and retries", async (cause, copy) => {
    const onRetry = jest.fn();
    await render(<FailureState cause={cause} onRetry={onRetry} />);
    expect(screen.getByText(copy.title)).toBeTruthy();
    expect(screen.getByText(copy.body)).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: en.retry }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("replaces the explanation with a message and keeps the title", async () => {
    await render(<FailureState cause="offline" message="Tap Retry" onRetry={jest.fn()} />);
    expect(screen.getByText(en.error.offline.title)).toBeTruthy();
    expect(screen.getByText("Tap Retry")).toBeTruthy();
    expect(screen.queryByText(en.error.offline.body)).toBeNull();
  });
});

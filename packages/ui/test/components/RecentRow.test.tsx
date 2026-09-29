// packages/ui/test/components/RecentRow.test.tsx
//
// Tests for the RecentRow's two actions.
//
// Tested:
// - RecentRow
//
// What is covered:
// - Pressing the row runs the query
// - Pressing the remove button removes without running the query
// - The remove button is not nested in the row button
//
// Run with: pnpm --filter @beatly/ui test -- RecentRow
//
// SEE: packages/ui/src/components/RecentRow.tsx

import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, within } from "@testing-library/react-native";

import { RecentRow } from "../../src/components/RecentRow.tsx";

describe("RecentRow", () => {
  it("runs the query when the row is pressed", async () => {
    const onPress = jest.fn();
    const onRemove = jest.fn();
    await render(
      <RecentRow label="daft" onPress={onPress} removeLabel="Remove daft" onRemove={onRemove} />,
    );
    await fireEvent.press(screen.getByRole("button", { name: "daft" }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onRemove).not.toHaveBeenCalled();
  });

  it("removes without running the query when the remove button is pressed", async () => {
    const onPress = jest.fn();
    const onRemove = jest.fn();
    await render(
      <RecentRow label="daft" onPress={onPress} removeLabel="Remove daft" onRemove={onRemove} />,
    );
    await fireEvent.press(screen.getByRole("button", { name: "Remove daft" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("keeps the remove button outside the row button so screen readers can reach it", async () => {
    await render(
      <RecentRow label="daft" onPress={jest.fn()} removeLabel="Remove daft" onRemove={jest.fn()} />,
    );
    const row = screen.getByRole("button", { name: "daft" });
    expect(within(row).queryByRole("button", { name: "Remove daft" })).toBeNull();
    expect(screen.getByRole("button", { name: "Remove daft" })).toBeTruthy();
  });
});

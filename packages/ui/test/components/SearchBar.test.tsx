// packages/ui/test/components/SearchBar.test.tsx
//
// Tests for the SearchBar's clear button and submit.
//
// Tested:
// - SearchBar
//
// What is covered:
// - The clear button appears only with text and empties it
// - The keyboard's submit calls onSubmit
//
// Run with: pnpm --filter @beatly/ui test -- SearchBar
//
// SEE: packages/ui/src/components/SearchBar.tsx

import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { SearchBar } from "../../src/components/SearchBar.tsx";

function bar(value: string, onChangeText = jest.fn(), onSubmit = jest.fn()) {
  return (
    <SearchBar
      value={value}
      onChangeText={onChangeText}
      placeholder="Search"
      accessibilityLabel="Search field"
      clearLabel="Clear"
      onSubmit={onSubmit}
    />
  );
}

describe("SearchBar", () => {
  it("shows no clear button while the text is empty", async () => {
    await render(bar(""));
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
  });

  it("shows the clear button with text and empties the text when pressed", async () => {
    const onChangeText = jest.fn();
    await render(bar("abc", onChangeText));
    await fireEvent.press(screen.getByRole("button", { name: "Clear" }));
    expect(onChangeText).toHaveBeenCalledWith("");
  });

  it("calls onSubmit when the keyboard submits", async () => {
    const onSubmit = jest.fn();
    await render(bar("abc", jest.fn(), onSubmit));
    await fireEvent(screen.getByLabelText("Search field"), "submitEditing");
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

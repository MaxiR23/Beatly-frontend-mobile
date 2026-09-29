// packages/ui/test/components/Carousel.test.tsx
//
// Tests for the Carousel.
//
// Tested:
// - Carousel
//
// What is covered:
// - an item's onPress called and exposed as a button, an item without onPress non-pressable
//
// Run with: pnpm --filter @beatly/ui test -- Carousel
//
// SEE: packages/ui/src/components/Carousel.tsx

import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { Carousel } from "../../src/components/Carousel.tsx";

describe("Carousel", () => {
  it("calls an item's onPress and exposes it as a button", async () => {
    const onPress = jest.fn();
    await render(
      <Carousel
        title="Section"
        items={[{ key: "a", title: "First", urls: [], shape: "square", onPress }]}
      />,
    );
    await fireEvent.press(screen.getByRole("button", { name: "First" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("keeps an item without onPress non-pressable", async () => {
    await render(
      <Carousel
        title="Section"
        items={[{ key: "a", title: "First", urls: [], shape: "square" }]}
      />,
    );
    expect(screen.getByText("First")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});

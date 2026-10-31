// packages/ui/test/components/CarouselSkeleton.test.tsx
//
// Tests for the CarouselSkeleton.
//
// Tested:
// - CarouselSkeleton
//
// What is covered:
// - layout.skeletonCards placeholder cards
// - a progress bar with its label when given one, hidden from screen readers without it
//
// Run with: pnpm --filter @beatly/ui test -- CarouselSkeleton
//
// SEE: packages/ui/src/components/CarouselSkeleton.tsx

import { describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";

import { CarouselSkeleton } from "../../src/components/CarouselSkeleton.tsx";
import { layout } from "../../src/tokens/spacing.ts";

describe("CarouselSkeleton", () => {
  it("draws layout.skeletonCards placeholder cards", async () => {
    await render(<CarouselSkeleton />);
    const root = screen.getByTestId("carousel-skeleton");
    // The title bar, then one column per card.
    const row = root.children[1];
    expect(typeof row === "object" && row.children).toHaveLength(layout.skeletonCards);
  });

  it("is a progress bar with its label when given one", async () => {
    await render(<CarouselSkeleton label="Loading" />);
    expect(screen.getByRole("progressbar", { name: "Loading" })).toBeTruthy();
  });

  it("is hidden from screen readers without a label", async () => {
    await render(<CarouselSkeleton />);
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.getByTestId("carousel-skeleton").props.accessible).toBe(false);
  });
});

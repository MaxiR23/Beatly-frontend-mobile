// packages/ui/test/components/MediaGrid.test.tsx
//
// Tests for the MediaGrid.
//
// Tested:
// - MediaGrid, gridCardSize
//
// What is covered:
// - the card side from the window width, every item drawn, the cover box sized to the card
//
// Run with: pnpm --filter @beatly/ui test -- MediaGrid
//
// SEE: packages/ui/src/components/MediaGrid.tsx

import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import { Dimensions } from "react-native";

import { gridCardSize, MediaGrid } from "../../src/components/MediaGrid.tsx";
import { layout, spacing } from "../../src/tokens/spacing.ts";

const items = [
  { key: "a", title: "First", subtitle: "1 track", images: [], shape: "square" as const },
  { key: "b", title: "Second", subtitle: "2 tracks", images: [], shape: "square" as const },
  { key: "c", title: "Third", subtitle: "3 tracks", images: [], shape: "square" as const },
];

describe("gridCardSize", () => {
  it("splits the window minus the gutters and the gap in two", () => {
    expect(gridCardSize(390)).toBe(Math.floor((390 - 2 * layout.gutter - spacing.md) / 2));
  });
});

describe("MediaGrid", () => {
  const original = { window: Dimensions.get("window"), screen: Dimensions.get("screen") };
  const phone = { width: 390, height: 844, scale: 3, fontScale: 1 };
  beforeEach(() => {
    Dimensions.set({ window: phone, screen: phone });
  });
  afterEach(() => {
    Dimensions.set(original);
  });

  it("draws a card's cover at the medium tier on a phone", async () => {
    const image = { small: "test://img/1/s", medium: "test://img/1/m", large: "test://img/1/l" };
    await render(
      <MediaGrid
        items={[{ key: "a", title: "First", images: [image], shape: "square" as const }]}
        bottomPadding={0}
      />,
    );
    expect(screen.getByTestId("cover-single").props.source).toEqual([{ uri: "test://img/1/m" }]);
  });

  it("draws every item's title and subtitle", async () => {
    await render(<MediaGrid items={items} bottomPadding={0} />);
    for (const item of items) {
      expect(screen.getByText(item.title)).toBeTruthy();
      expect(screen.getByText(item.subtitle)).toBeTruthy();
    }
  });

  it("sizes each cover box from the window width", async () => {
    await render(<MediaGrid items={items} bottomPadding={0} />);
    const { width } = Dimensions.get("window");
    const placeholder = screen.getAllByTestId("cover-placeholder")[0];
    const box = placeholder?.parent;
    expect(box?.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: gridCardSize(width) })]),
    );
  });
});

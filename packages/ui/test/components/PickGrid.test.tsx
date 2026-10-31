// packages/ui/test/components/PickGrid.test.tsx
//
// Tests for the PickGrid.
//
// Tested:
// - PickGrid, pickTileSize
//
// What is covered:
// - the tile side from the window width in three columns, the name under a round cover
// - the ring and the check badge only on a selected tile; the pop from motion.enterScale with the spring when it becomes selected, none on deselect or under reduce motion
// - a fadeIn row fades in over motion.duration.slow on the native driver, at rest under reduce motion
// - the accessibility state, an unselected disabled tile ignoring presses, the empty element, the header
//
// Run with: pnpm --filter @beatly/ui test -- PickGrid
//
// SEE: packages/ui/src/components/PickGrid.tsx

import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Animated, Dimensions, Text as NativeText } from "react-native";
import type { ReactElement } from "react";

import {
  pickTileSize,
  PickGrid,
  type PickRow,
  type PickTileItem,
} from "../../src/components/PickGrid.tsx";
import { border } from "../../src/tokens/border.ts";
import { color } from "../../src/tokens/color.ts";
import { icon } from "../../src/tokens/icon.ts";
import { motion } from "../../src/tokens/motion.ts";
import { layout, spacing } from "../../src/tokens/spacing.ts";
import { flatStyle } from "../helpers/flatStyle.ts";

const spring = jest.spyOn(Animated, "spring");
const timing = jest.spyOn(Animated, "timing");

const phone = { width: 390, height: 844, scale: 3, fontScale: 1 };
const original = { window: Dimensions.get("window"), screen: Dimensions.get("screen") };

beforeEach(() => {
  Dimensions.set({ window: phone, screen: phone });
});

afterEach(() => {
  Dimensions.set(original);
  spring.mockClear();
  timing.mockClear();
});

function tile(id: string, patch: Partial<PickTileItem> = {}): PickTileItem {
  return {
    key: id,
    name: `Artist ${id}`,
    image: {
      small: `test://img/${id}/s`,
      medium: `test://img/${id}/m`,
      large: `test://img/${id}/l`,
    },
    selected: false,
    disabled: false,
    onPress: jest.fn(),
    ...patch,
  };
}

function row(key: string, tiles: PickTileItem[], fadeIn = false): PickRow {
  return { key, fadeIn, tiles };
}

const header = <NativeText>header</NativeText>;
const empty = <NativeText>nothing here</NativeText>;

function grid(rows: PickRow[], reduceMotion = false): ReactElement {
  return (
    <PickGrid
      rows={rows}
      header={header}
      empty={empty}
      bottomPadding={0}
      onEndReached={() => undefined}
      reduceMotion={reduceMotion}
    />
  );
}

describe("pickTileSize", () => {
  it("splits the window minus the gutters and the two gaps in three", () => {
    expect(pickTileSize(390)).toBe(Math.floor((390 - 2 * layout.gutter - 2 * spacing.md) / 3));
  });
});

describe("PickGrid", () => {
  it("draws the name centered under a round cover", async () => {
    await render(grid([row("r1", [tile("a"), tile("b"), tile("c")])]));
    expect(screen.getAllByTestId("pick-row")).toHaveLength(1);
    const name = screen.getByText("Artist a");
    expect(flatStyle(name.props.style).textAlign).toBe("center");
    expect(screen.getAllByTestId("cover-single")).toHaveLength(3);
    const side = pickTileSize(390);
    expect(screen.getAllByTestId("pick-box")[0]).toHaveStyle({ width: side, height: side });
  });

  it("draws the ring and the check badge only on a selected tile", async () => {
    await render(grid([row("r1", [tile("a", { selected: true }), tile("b")])]));
    expect(screen.getAllByTestId("pick-ring")).toHaveLength(1);
    expect(screen.getAllByTestId("pick-badge")).toHaveLength(1);
    expect(screen.getByTestId("pick-ring")).toHaveStyle({
      borderWidth: border.widthFocused,
      borderColor: color.accent.primary,
    });
    expect(screen.getByTestId("pick-badge")).toHaveStyle({
      width: icon.size.lg,
      backgroundColor: color.accent.primary,
    });
  });

  it("pops a tile from motion.enterScale with the spring when it becomes selected", async () => {
    const view = await render(grid([row("r1", [tile("a")])]));
    expect(spring).not.toHaveBeenCalled();
    await view.rerender(grid([row("r1", [tile("a", { selected: true })])]));
    expect(spring).toHaveBeenCalledTimes(1);
    expect(spring.mock.calls[0]?.[1]).toMatchObject({
      toValue: 1,
      damping: motion.spring.damping,
      stiffness: motion.spring.stiffness,
      useNativeDriver: true,
    });
  });

  it("does not pop on deselect or under reduce motion", async () => {
    const view = await render(grid([row("r1", [tile("a", { selected: true })])]));
    spring.mockClear();
    await view.rerender(grid([row("r1", [tile("a")])]));
    expect(spring).not.toHaveBeenCalled();
    const calm = await render(grid([row("r2", [tile("b")])], true));
    await calm.rerender(grid([row("r2", [tile("b", { selected: true })])], true));
    expect(spring).not.toHaveBeenCalled();
  });

  it("fades a fadeIn row in over motion.duration.slow on the native driver", async () => {
    await render(grid([row("r1", [tile("a")], true)]));
    expect(timing).toHaveBeenCalledTimes(1);
    expect(timing.mock.calls[0]?.[1]).toMatchObject({
      toValue: 1,
      duration: motion.duration.slow,
      useNativeDriver: true,
    });
    expect(screen.getByTestId("pick-row-fade")).toHaveStyle({ opacity: 0 });
  });

  it("draws a fadeIn row at rest under reduce motion", async () => {
    await render(grid([row("r1", [tile("a")], true)], true));
    expect(timing).not.toHaveBeenCalled();
    expect(screen.getByTestId("pick-row-fade")).toHaveStyle({ opacity: 1 });
  });

  it("reports selected and disabled in the accessibility state, and an unselected disabled tile ignores presses", async () => {
    const free = tile("a", { selected: true, disabled: true });
    const blocked = tile("b", { disabled: true });
    await render(grid([row("r1", [free, blocked])]));
    const [first, second] = screen.getAllByRole("button");
    // A selected tile stays pressable at the limit, so it can be unpicked, and is not announced as disabled.
    expect(first?.props.accessibilityState).toMatchObject({ selected: true, disabled: false });
    expect(second?.props.accessibilityState).toMatchObject({ selected: false, disabled: true });
    await fireEvent.press(screen.getByLabelText("Artist b"));
    expect(blocked.onPress).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByLabelText("Artist a"));
    expect(free.onPress).toHaveBeenCalledTimes(1);
  });

  it("draws the empty element when there are no rows", async () => {
    await render(grid([]));
    expect(screen.getByText("nothing here")).toBeTruthy();
    expect(screen.getByText("header")).toBeTruthy();
  });
});

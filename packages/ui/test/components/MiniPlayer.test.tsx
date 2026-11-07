// packages/ui/test/components/MiniPlayer.test.tsx
//
// Tests for the MiniPlayer.
//
// Tested:
// - MiniPlayer
//
// What is covered:
// - the title and subtitle, the failed subtitle in the error tone, the open, toggle and next presses, the pause label while playing, no progress element
// - the tint handed to the glass surface with reduce motion: no fade under it
// - Android: a rectangle with radius.sm corners, a square cover, filled narrow play and next together; iOS keeps the pill, the round cover and the outlined control-size buttons
// - the bare surface: filling and clipping, no glass and no tint, with the presses still working
//
// Run with: pnpm --filter @beatly/ui test -- MiniPlayer
//
// SEE: packages/ui/src/components/MiniPlayer.tsx

import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ComponentProps } from "react";
import { Animated, Platform, type StyleProp, type ViewStyle } from "react-native";

import { MiniPlayer } from "../../src/components/MiniPlayer.tsx";
import { color } from "../../src/tokens/color.ts";
import { radius } from "../../src/tokens/radius.ts";
import { layout, spacing } from "../../src/tokens/spacing.ts";
import { flatStyle } from "../helpers/flatStyle.ts";

jest.mock("expo-glass-effect", () => {
  const { View } = jest.requireActual<{ View: unknown }>("react-native");
  return {
    GlassView: View,
    isLiquidGlassAvailable: () => false,
    isGlassEffectAPIAvailable: () => false,
  };
});

const tiers = (n: string) => ({
  small: `test://img/${n}/s`,
  medium: `test://img/${n}/m`,
  large: `test://img/${n}/l`,
});

const labels = { open: "Open player", play: "Play", pause: "Pause", next: "Next" };

async function draw(over: Partial<ComponentProps<typeof MiniPlayer>> = {}) {
  const handlers = { onOpen: jest.fn(), onToggle: jest.fn(), onNext: jest.fn() };
  await render(
    <MiniPlayer
      title="Song"
      subtitle="Artist"
      failed={false}
      image={null}
      tint={null}
      playing={false}
      reduceMotion={false}
      busy={false}
      labels={labels}
      {...handlers}
      {...over}
    />,
  );
  return handlers;
}

afterEach(() => {
  Platform.OS = "ios";
});

interface JsonNode {
  props: Record<string, unknown>;
  children: unknown;
}

function isJsonNode(value: unknown): value is JsonNode {
  return typeof value === "object" && value !== null && "props" in value;
}

// The glyph fills (svg roots) under the node with the given testID, in order.
function fillsUnder(tree: unknown, testID: string): unknown[] {
  const fills: unknown[] = [];
  const collect = (node: unknown) => {
    if (Array.isArray(node)) node.forEach(collect);
    if (!isJsonNode(node)) return;
    if ("xmlns" in node.props) fills.push(node.props.fill);
    collect(node.children);
  };
  const find = (node: unknown) => {
    if (Array.isArray(node)) node.forEach(find);
    if (!isJsonNode(node)) return;
    if (node.props.testID === testID) collect(node.children);
    else find(node.children);
  };
  find(tree);
  return fills;
}

function box(name: string) {
  return flatStyle(screen.getByRole("button", { name }).props.style as StyleProp<ViewStyle>);
}

describe("MiniPlayer", () => {
  it("on Android draws a rectangle with small corners, not the pill", async () => {
    Platform.OS = "android";
    await draw();
    expect(screen.getByTestId("mini-player")).toHaveStyle({ borderRadius: radius.sm });
    expect(screen.getByTestId("mini-player")).not.toHaveStyle({ borderRadius: radius.full });
  });

  it("on Android draws a square cover", async () => {
    Platform.OS = "android";
    await draw();
    const cover = screen.getByTestId("cover-placeholder").parent;
    expect(flatStyle(cover?.props.style)).toMatchObject({ borderRadius: radius.sm });
  });

  it("on Android draws filled play and next together, narrow and control-height tall", async () => {
    Platform.OS = "android";
    await draw();
    expect(flatStyle(screen.getByTestId("mini-player-controls").props.style)).toMatchObject({
      flexDirection: "row",
      gap: spacing.none,
    });
    for (const name of ["Play", "Next"]) {
      expect(box(name)).toMatchObject({
        width: layout.iconButtonNarrow,
        height: layout.controlHeight,
      });
    }
    expect(layout.iconButtonNarrow).toBeLessThan(layout.controlHeight);
    expect(fillsUnder(screen.toJSON(), "mini-player-controls")).toEqual([
      color.text.primary,
      color.text.primary,
    ]);
  });

  it("on iOS keeps the pill, the round cover and the outlined control-size buttons", async () => {
    await draw();
    expect(screen.getByTestId("mini-player")).toHaveStyle({ borderRadius: radius.full });
    const cover = screen.getByTestId("cover-placeholder").parent;
    expect(flatStyle(cover?.props.style)).toMatchObject({ borderRadius: radius.full });
    for (const name of ["Play", "Next"]) {
      expect(box(name)).toMatchObject({ width: layout.controlHeight });
    }
    expect(screen.queryByTestId("mini-player-controls")).toBeNull();
    expect(fillsUnder(screen.toJSON(), "mini-player").filter((fill) => fill !== "none")).toEqual(
      [],
    );
  });

  it("draws the cover at the small tier", async () => {
    await draw({ image: tiers("1") });
    expect(screen.getByTestId("cover-single").props.source).toEqual([{ uri: "test://img/1/s" }]);
  });

  it("draws the placeholder without an image", async () => {
    await draw({ image: null });
    expect(screen.getByTestId("cover-placeholder")).toBeTruthy();
    expect(screen.queryByTestId("cover-single")).toBeNull();
  });

  it("draws the title and the subtitle", async () => {
    await draw();
    expect(screen.getByText("Song")).toBeTruthy();
    expect(screen.getByText("Artist")).toHaveStyle({ color: color.text.secondary });
  });

  it("draws the failed subtitle in the error tone", async () => {
    await draw({ subtitle: "Can't play", failed: true });
    expect(screen.getByText("Can't play")).toHaveStyle({ color: color.status.error });
  });

  it("opens on the body, toggles on play and goes next", async () => {
    const h = await draw();
    await fireEvent.press(screen.getByRole("button", { name: "Open player" }));
    await fireEvent.press(screen.getByRole("button", { name: "Play" }));
    await fireEvent.press(screen.getByRole("button", { name: "Next" }));
    expect(h.onOpen).toHaveBeenCalledTimes(1);
    expect(h.onToggle).toHaveBeenCalledTimes(1);
    expect(h.onNext).toHaveBeenCalledTimes(1);
  });

  it("draws bare, filling and clipping to its container, without the glass surface or the tint", async () => {
    const h = await draw({ surface: "bare", tint: "#336699" });
    const bar = screen.getByTestId("mini-player");
    expect(bar).toHaveStyle({ flex: 1, overflow: "hidden" });
    expect(bar).not.toHaveStyle({ backgroundColor: color.surface.raised });
    expect(bar).not.toHaveStyle({ backgroundColor: "#336699" });
    await fireEvent.press(screen.getByRole("button", { name: "Open player" }));
    await fireEvent.press(screen.getByRole("button", { name: "Play" }));
    expect(h.onOpen).toHaveBeenCalledTimes(1);
    expect(h.onToggle).toHaveBeenCalledTimes(1);
  });

  it("hands reduce motion to the glass surface's tint", async () => {
    const timing = jest.spyOn(Animated, "timing");
    try {
      const props = {
        title: "Song",
        subtitle: "Artist",
        failed: false,
        image: null,
        playing: false,
        busy: false,
        labels,
        onOpen: jest.fn(),
        onToggle: jest.fn(),
        onNext: jest.fn(),
        reduceMotion: true,
      };
      const view = await render(<MiniPlayer {...props} tint={null} />);
      await view.rerender(<MiniPlayer {...props} tint="#336699" />);
      expect(screen.getByTestId("mini-player-tint")).toHaveStyle({ opacity: 1 });
      expect(timing).not.toHaveBeenCalled();
    } finally {
      timing.mockRestore();
    }
  });

  it("shows the pause label while playing and draws no progress element", async () => {
    await draw({ playing: true });
    expect(screen.getByRole("button", { name: "Pause" })).toBeTruthy();
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.queryByRole("adjustable")).toBeNull();
  });
});

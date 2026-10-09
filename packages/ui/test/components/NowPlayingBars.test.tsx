// packages/ui/test/components/NowPlayingBars.test.tsx
//
// Tests for the NowPlayingBars indicator.
//
// Tested:
// - NowPlayingBars
//
// What is covered:
// - three bars of the bar width in the accent color inside an icon.size.sm box
// - one loop per bar with its own duration while playing, stopped when paused and on unmount
// - reduce motion: no loop, the static heights
//
// Run with: pnpm --filter @beatly/ui test -- NowPlayingBars
//
// SEE: packages/ui/src/components/NowPlayingBars.tsx

import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import { Animated } from "react-native";

import { NowPlayingBars } from "../../src/components/NowPlayingBars.tsx";
import { color } from "../../src/tokens/color.ts";
import { icon } from "../../src/tokens/icon.ts";
import { motion } from "../../src/tokens/motion.ts";
import { layout } from "../../src/tokens/spacing.ts";

const loop = jest.spyOn(Animated, "loop");
const timing = jest.spyOn(Animated, "timing");

afterEach(() => {
  loop.mockClear();
  timing.mockClear();
});

// A spy on the stop of every loop started so far.
function stopSpies() {
  return loop.mock.results.flatMap((result) =>
    result.type === "return" ? [jest.spyOn(result.value, "stop")] : [],
  );
}

const element = (state: "playing" | "paused", reduceMotion = false) => (
  <NowPlayingBars state={state} reduceMotion={reduceMotion} testID="bars" />
);

describe("NowPlayingBars", () => {
  it("draws three bars of the bar width in the accent color, an icon.size.sm tall box", async () => {
    await render(element("playing"));
    expect(screen.getByTestId("bars")).toHaveStyle({ width: icon.size.sm, height: icon.size.sm });
    const bars = screen.getAllByTestId("now-playing-bar");
    expect(bars).toHaveLength(3);
    for (const bar of bars) {
      expect(bar).toHaveStyle({
        width: layout.nowPlayingBarWidth,
        backgroundColor: color.accent.primary,
      });
    }
  });

  it("loops each bar with its own duration while playing", async () => {
    await render(element("playing"));
    expect(loop).toHaveBeenCalledTimes(3);
    expect(timing).toHaveBeenCalledTimes(6);
    motion.nowPlaying.durations.forEach((duration, index) => {
      expect(timing.mock.calls[index * 2]?.[1]).toMatchObject({
        toValue: 1,
        duration,
        useNativeDriver: true,
      });
      expect(timing.mock.calls[index * 2 + 1]?.[1]).toMatchObject({
        toValue: motion.nowPlaying.minScale,
        duration,
        useNativeDriver: true,
      });
    });
  });

  it("stops the loops when paused and starts none", async () => {
    const view = await render(element("playing"));
    const stops = stopSpies();
    loop.mockClear();
    await view.rerender(element("paused"));
    for (const stop of stops) expect(stop).toHaveBeenCalled();
    expect(loop).not.toHaveBeenCalled();
  });

  it("starts no loop under reduce motion and holds the static heights", async () => {
    await render(element("playing", true));
    expect(loop).not.toHaveBeenCalled();
    screen.getAllByTestId("now-playing-bar").forEach((bar, index) => {
      expect(bar).toHaveStyle({
        transform: [{ scaleY: motion.nowPlaying.staticScales[index] ?? 1 }],
      });
    });
  });

  it("stops the loops on unmount", async () => {
    const view = await render(element("playing"));
    const stops = stopSpies();
    await view.unmount();
    for (const stop of stops) expect(stop).toHaveBeenCalled();
  });
});

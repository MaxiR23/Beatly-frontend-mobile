// packages/ui/test/components/BeatlyLogo.test.tsx
//
// Tests for the BeatlyLogo.
//
// Tested:
// - BeatlyLogo
//
// What is covered:
// - five accent bars of the legacy geometry (layout.logoBars) with round ends in an icon.size.hero box
// - one loop per bar with its own motion.logo duration down to motion.logo.minScale on the native driver
// - reduce motion: no loop, every bar at scale 1
// - the loops stop on unmount
//
// Run with: pnpm --filter @beatly/ui test -- BeatlyLogo
//
// SEE: packages/ui/src/components/BeatlyLogo.tsx

import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import { Animated } from "react-native";

import { BeatlyLogo } from "../../src/components/BeatlyLogo.tsx";
import { color } from "../../src/tokens/color.ts";
import { icon } from "../../src/tokens/icon.ts";
import { motion } from "../../src/tokens/motion.ts";
import { radius } from "../../src/tokens/radius.ts";
import { layout } from "../../src/tokens/spacing.ts";
import { flatStyle } from "../helpers/flatStyle.ts";

const loop = jest.spyOn(Animated, "loop");
const timing = jest.spyOn(Animated, "timing");

afterEach(() => {
  loop.mockClear();
  timing.mockClear();
});

function stopSpies() {
  return loop.mock.results.flatMap((result) =>
    result.type === "return" ? [jest.spyOn(result.value, "stop")] : [],
  );
}

const element = (reduceMotion = false) => <BeatlyLogo reduceMotion={reduceMotion} testID="logo" />;

describe("BeatlyLogo", () => {
  it("draws five accent bars of the legacy geometry in an icon.size.hero box", async () => {
    await render(element());
    expect(screen.getByTestId("logo")).toHaveStyle({
      width: icon.size.hero,
      height: icon.size.hero,
    });
    const bars = screen.getAllByTestId("logo-bar");
    expect(bars).toHaveLength(5);
    const unit = icon.size.hero / layout.logoBars.units;
    bars.forEach((bar, index) => {
      const style = flatStyle(bar.props.style);
      expect(style.width).toBeCloseTo(layout.logoBars.width * unit);
      expect(style.height).toBeCloseTo(
        ((layout.logoBars.lengths[index] ?? 0) + layout.logoBars.width) * unit,
      );
      expect(style.borderRadius).toBe(radius.full);
      expect(style.backgroundColor).toBe(color.accent.primary);
    });
  });

  it("loops each bar with its own motion.logo duration down to motion.logo.minScale on the native driver", async () => {
    await render(element());
    expect(loop).toHaveBeenCalledTimes(5);
    expect(timing).toHaveBeenCalledTimes(10);
    motion.logo.durations.forEach((duration, index) => {
      expect(timing.mock.calls[index * 2]?.[1]).toMatchObject({
        toValue: 1,
        duration,
        useNativeDriver: true,
      });
      expect(timing.mock.calls[index * 2 + 1]?.[1]).toMatchObject({
        toValue: motion.logo.minScale,
        duration,
        useNativeDriver: true,
      });
    });
  });

  it("starts no loop under reduce motion and holds every bar at scale 1", async () => {
    await render(element(true));
    expect(loop).not.toHaveBeenCalled();
    for (const bar of screen.getAllByTestId("logo-bar")) {
      expect(bar).toHaveStyle({ transform: [{ scaleY: 1 }] });
    }
  });

  it("stops the loops on unmount", async () => {
    const view = await render(element());
    const stops = stopSpies();
    await view.unmount();
    expect(stops).toHaveLength(5);
    for (const stop of stops) expect(stop).toHaveBeenCalled();
  });
});

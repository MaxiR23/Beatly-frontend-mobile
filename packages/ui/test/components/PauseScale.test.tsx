// packages/ui/test/components/PauseScale.test.tsx
//
// Tests for the PauseScale wrapper.
//
// Tested:
// - PauseScale
//
// What is covered:
// - the scale at mount while paused and playing, the springs in both directions with the motion spring
// - reduce motion: full size, never springing down
//
// Run with: pnpm --filter @beatly/ui test -- PauseScale
//
// SEE: packages/ui/src/components/PauseScale.tsx

import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import { Animated, View } from "react-native";

import { PauseScale } from "../../src/components/PauseScale.tsx";
import { motion } from "../../src/tokens/motion.ts";

const spring = jest.spyOn(Animated, "spring");

afterEach(() => {
  spring.mockClear();
});

const element = (paused: boolean, reduceMotion = false) => (
  <PauseScale paused={paused} reduceMotion={reduceMotion} testID="scale">
    <View />
  </PauseScale>
);

describe("PauseScale", () => {
  it("starts at the paused scale while paused and at full size while playing", async () => {
    const view = await render(element(true));
    expect(screen.getByTestId("scale")).toHaveStyle({
      transform: [{ scale: motion.pausedScale }],
    });
    await view.unmount();
    await render(element(false));
    expect(screen.getByTestId("scale")).toHaveStyle({ transform: [{ scale: 1 }] });
  });

  it("springs to full size when playing resumes and down when paused, with the motion spring", async () => {
    const view = await render(element(true));
    await view.rerender(element(false));
    expect(spring).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        toValue: 1,
        damping: motion.spring.damping,
        stiffness: motion.spring.stiffness,
      }),
    );
    await view.rerender(element(true));
    expect(spring).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: motion.pausedScale }),
    );
  });

  it("under reduce motion, stays at full size and never springs down", async () => {
    const view = await render(element(true, true));
    expect(screen.getByTestId("scale")).toHaveStyle({ transform: [{ scale: 1 }] });
    await view.rerender(element(false, true));
    await view.rerender(element(true, true));
    expect(screen.getByTestId("scale")).toHaveStyle({ transform: [{ scale: 1 }] });
    for (const [, config] of spring.mock.calls) {
      expect(config.toValue).not.toBe(motion.pausedScale);
    }
  });
});

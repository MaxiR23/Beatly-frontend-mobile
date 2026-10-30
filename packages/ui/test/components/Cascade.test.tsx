// packages/ui/test/components/Cascade.test.tsx
//
// Tests for the Cascade.
//
// Tested:
// - Cascade
//
// What is covered:
// - every child drawn; each starts from its own timing, motion.detailCascade.stagger apart, in motion.detailCascade.duration on the native driver
// - reduce motion: no timing, every child at rest
//
// Run with: pnpm --filter @beatly/ui test -- Cascade
//
// SEE: packages/ui/src/components/Cascade.tsx

import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import { Animated } from "react-native";

import { Cascade } from "../../src/components/Cascade.tsx";
import { Text } from "../../src/components/Text.tsx";
import { motion } from "../../src/tokens/motion.ts";

const timing = jest.spyOn(Animated, "timing");

afterEach(() => {
  timing.mockClear();
});

const element = (reduceMotion: boolean) => (
  <Cascade reduceMotion={reduceMotion}>
    <Text>one</Text>
    <Text>two</Text>
    <Text>three</Text>
  </Cascade>
);

describe("Cascade", () => {
  it("starts each child from opacity 0 and motion.detailCascade.offset, motion.detailCascade.stagger apart, on the native driver", async () => {
    await render(element(false));
    expect(screen.getByText("one")).toBeTruthy();
    expect(screen.getByText("three")).toBeTruthy();
    expect(timing).toHaveBeenCalledTimes(3);
    [0, 1, 2].forEach((index) => {
      expect(timing.mock.calls[index]?.[1]).toMatchObject({
        toValue: 1,
        duration: motion.detailCascade.duration,
        delay: index * motion.detailCascade.stagger,
        useNativeDriver: true,
      });
    });
    expect(screen.getAllByTestId("cascade-step")[0]).toHaveStyle({
      opacity: 0,
      transform: [{ translateY: motion.detailCascade.offset }],
    });
  });

  it("draws every child at rest under reduce motion", async () => {
    await render(element(true));
    expect(timing).not.toHaveBeenCalled();
    for (const step of screen.getAllByTestId("cascade-step")) {
      expect(step).toHaveStyle({ opacity: 1, transform: [{ translateY: 0 }] });
    }
  });
});

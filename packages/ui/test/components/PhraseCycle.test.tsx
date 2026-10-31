// packages/ui/test/components/PhraseCycle.test.tsx
//
// Tests for the PhraseCycle.
//
// Tested:
// - PhraseCycle
//
// What is covered:
// - the first phrase, then the next after motion.duration.phrase with a fade of motion.duration.base on the native driver
// - it stays on the last phrase
// - reduce motion: the first phrase and no timer
// - the fade-in of each new phrase is started and not stopped by the cleanup of the effect that advanced
// - the timer is cleared on unmount
//
// Run with: pnpm --filter @beatly/ui test -- PhraseCycle
//
// SEE: packages/ui/src/components/PhraseCycle.tsx

import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, render, screen } from "@testing-library/react-native";
import { Animated } from "react-native";

import { PhraseCycle } from "../../src/components/PhraseCycle.tsx";
import { motion } from "../../src/tokens/motion.ts";

const phrases = ["first", "second", "third"];
const timing = jest.spyOn(Animated, "timing");

// The timers this component sets: those of motion.duration.phrase.
function phraseTimers(setTimer: jest.SpiedFunction<typeof setTimeout>) {
  return setTimer.mock.calls.filter((call) => call[1] === motion.duration.phrase);
}

// jest-expo has no frame clock: a fade completes as soon as it starts.
function finishAtOnce(): Animated.CompositeAnimation {
  const animation = {
    start: (done?: (result: { finished: boolean }) => void) => {
      done?.({ finished: true });
    },
    stop: () => undefined,
    reset: () => undefined,
  };
  return animation;
}

beforeEach(() => {
  jest.useFakeTimers();
  timing.mockImplementation(finishAtOnce);
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
  timing.mockReset();
});

describe("PhraseCycle", () => {
  it("shows the first phrase, then the next after motion.duration.phrase with a fade", async () => {
    await render(<PhraseCycle phrases={phrases} reduceMotion={false} />);
    expect(screen.getByText("first")).toBeTruthy();
    await act(() => {
      jest.advanceTimersByTime(motion.duration.phrase);
      return Promise.resolve();
    });
    expect(screen.getByText("second")).toBeTruthy();
    expect(timing).toHaveBeenCalledTimes(2);
    expect(timing.mock.calls[0]?.[1]).toMatchObject({
      toValue: 0,
      duration: motion.duration.base,
      useNativeDriver: true,
    });
    expect(timing.mock.calls[1]?.[1]).toMatchObject({
      toValue: 1,
      duration: motion.duration.base,
      useNativeDriver: true,
    });
  });

  it("stays on the last phrase", async () => {
    const setTimer = jest.spyOn(globalThis, "setTimeout");
    await render(<PhraseCycle phrases={phrases} reduceMotion={false} />);
    for (let step = 0; step < 4; step += 1) {
      await act(() => {
        jest.advanceTimersByTime(motion.duration.phrase);
        return Promise.resolve();
      });
    }
    expect(screen.getByText("third")).toBeTruthy();
    expect(phraseTimers(setTimer)).toHaveLength(2);
  });

  it("under reduce motion shows the first phrase and never advances", async () => {
    const setTimer = jest.spyOn(globalThis, "setTimeout");
    await render(<PhraseCycle phrases={phrases} reduceMotion />);
    expect(phraseTimers(setTimer)).toHaveLength(0);
    await act(() => {
      jest.advanceTimersByTime(motion.duration.phrase * 3);
      return Promise.resolve();
    });
    expect(screen.getByText("first")).toBeTruthy();
    expect(timing).not.toHaveBeenCalled();
  });

  it("does not stop the fade-in of a new phrase", async () => {
    const log: string[] = [];
    jest.spyOn(Animated, "timing").mockImplementation((_value, config) => {
      const target = config.toValue === 0 ? "0" : "1";
      return {
        start: (done?: (result: { finished: boolean }) => void) => {
          log.push(`start ${target}`);
          // Only the fade-out completes; the fade-in keeps running.
          if (config.toValue === 0) done?.({ finished: true });
        },
        stop: () => {
          log.push(`stop ${target}`);
        },
        reset: () => undefined,
      };
    });
    await render(<PhraseCycle phrases={phrases} reduceMotion={false} />);
    await act(() => {
      jest.advanceTimersByTime(motion.duration.phrase);
      return Promise.resolve();
    });
    expect(screen.getByText("second")).toBeTruthy();
    expect(log).toContain("start 1");
    expect(log).not.toContain("stop 1");
    await act(() => {
      jest.advanceTimersByTime(motion.duration.phrase);
      return Promise.resolve();
    });
    expect(screen.getByText("third")).toBeTruthy();
    expect(log.filter((entry) => entry === "start 1")).toHaveLength(2);
    expect(log.slice(log.lastIndexOf("start 1"))).toEqual(["start 1"]);
  });

  it("clears its timer on unmount", async () => {
    const setTimer = jest.spyOn(globalThis, "setTimeout");
    const clearTimer = jest.spyOn(globalThis, "clearTimeout");
    const view = await render(<PhraseCycle phrases={phrases} reduceMotion={false} />);
    const index = setTimer.mock.calls.findIndex((call) => call[1] === motion.duration.phrase);
    const id = setTimer.mock.results[index]?.value;
    await view.unmount();
    expect(clearTimer.mock.calls.some((call) => call[0] === id)).toBe(true);
  });
});

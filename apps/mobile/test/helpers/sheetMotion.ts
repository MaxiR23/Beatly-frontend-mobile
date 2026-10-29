// apps/mobile/test/helpers/sheetMotion.ts
//
// Test helper: holds every Animated.timing so a test can see a sheet half way through its close.
//
// Tested:
// - Not a test itself; used by the host tests that prove a sheet stays drawn through its close
//
// What is covered:
// - the held timings, ended together with finished true, and the restore of the real Animated.timing
//
// Run with: pnpm --filter @beatly/mobile test
//
// SEE: packages/ui/src/components/Sheet.tsx

import { jest } from "@jest/globals";
import { act } from "@testing-library/react-native";
import { Animated } from "react-native";

type Done = (result: { finished: boolean }) => void;

export function holdSheetMotion() {
  const realTiming = Animated.timing;
  const timing = jest.spyOn(Animated, "timing");
  let pending: Done[] = [];
  timing.mockImplementation(() => {
    return {
      start: (done?: Done) => {
        if (done !== undefined) pending.push(done);
      },
      stop: jest.fn(),
      reset: jest.fn(),
    };
  });
  return {
    async finishAll() {
      const done = pending;
      pending = [];
      await act(() => {
        for (const fn of done) fn({ finished: true });
      });
    },
    restore() {
      timing.mockImplementation(realTiming);
      timing.mockRestore();
    },
  };
}

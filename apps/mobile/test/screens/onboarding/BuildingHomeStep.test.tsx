// apps/mobile/test/screens/onboarding/BuildingHomeStep.test.tsx
//
// Tests for the onboarding's building step.
//
// Tested:
// - BuildingHomeStep
//
// What is covered:
// - the logo, the title and the first phrase with the first picked artist's name, en and es
// - the phrases advance
// - the error state of each cause with retry when failed
// - reduce motion: the first phrase and no loop
//
// Run with: pnpm --filter @beatly/mobile test -- BuildingHomeStep
//
// SEE: apps/mobile/src/screens/onboarding/BuildingHomeStep.tsx

import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import type { ErrorCause } from "@beatly/ui/native";
import { Animated } from "react-native";

import { i18n } from "../../../src/adapters/i18n.ts";
import { resources } from "../../../src/i18n/resources.ts";
import { BuildingHomeStep } from "../../../src/screens/onboarding/BuildingHomeStep.tsx";

const en = resources.en;
let loop: jest.SpiedFunction<typeof Animated.loop>;
let timing: jest.SpiedFunction<typeof Animated.timing>;

beforeEach(() => {
  jest.useFakeTimers();
  loop = jest.spyOn(Animated, "loop");
  timing = jest.spyOn(Animated, "timing");
});

afterEach(async () => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  await i18n.changeLanguage("en");
});

const element = (
  patch: { failure?: ErrorCause | null; reduceMotion?: boolean; onRetry?: () => void } = {},
) => (
  <BuildingHomeStep
    artistName="Nirvana"
    failure={patch.failure ?? null}
    reduceMotion={patch.reduceMotion ?? false}
    onRetry={patch.onRetry ?? (() => undefined)}
  />
);

describe("BuildingHomeStep", () => {
  it("draws the logo, the title and the first phrase with the first picked artist's name", async () => {
    await render(element());
    expect(screen.getAllByTestId("logo-bar")).toHaveLength(5);
    expect(screen.getByText(en.onboarding.building.title)).toBeTruthy();
    expect(screen.getByText("Finding artists like Nirvana")).toBeTruthy();
  });

  it("draws in es", async () => {
    await i18n.changeLanguage("es");
    await render(element());
    expect(screen.getByText(resources.es.onboarding.building.title)).toBeTruthy();
    expect(screen.getByText("Buscando artistas parecidos a Nirvana")).toBeTruthy();
  });

  it("advances the phrases", async () => {
    // jest-expo has no frame clock: a fade completes as soon as it starts, and the logo's loops stay idle.
    const finished = () =>
      ({
        start: (done?: (result: { finished: boolean }) => void) => {
          done?.({ finished: true });
        },
        stop: () => undefined,
        reset: () => undefined,
      }) as unknown as Animated.CompositeAnimation;
    timing.mockImplementation(finished);
    loop.mockImplementation(() => ({
      start: () => undefined,
      stop: () => undefined,
      reset: () => undefined,
    }));
    await render(element());
    await act(() => {
      jest.advanceTimersByTime(1800);
      return Promise.resolve();
    });
    expect(screen.getByText(en.onboarding.building.phrases.albums)).toBeTruthy();
    await act(() => {
      jest.advanceTimersByTime(1800);
      return Promise.resolve();
    });
    expect(screen.getByText(en.onboarding.building.phrases.almost)).toBeTruthy();
  });

  it.each([
    ["offline", en.common.error.offline.title],
    ["slow", en.common.error.slow.title],
    ["server", en.common.error.server.title],
  ] as const)("draws the %s cause with retry when failed", async (failure, title) => {
    const onRetry = jest.fn();
    await render(element({ failure, onRetry }));
    expect(screen.getByText(title)).toBeTruthy();
    expect(screen.queryAllByTestId("logo-bar")).toHaveLength(0);
    await fireEvent.press(screen.getByRole("button", { name: en.common.retry }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("under reduce motion shows the first phrase and no loop", async () => {
    await render(element({ reduceMotion: true }));
    expect(loop).not.toHaveBeenCalled();
    await act(() => {
      jest.advanceTimersByTime(5000);
      return Promise.resolve();
    });
    expect(screen.getByText("Finding artists like Nirvana")).toBeTruthy();
  });
});

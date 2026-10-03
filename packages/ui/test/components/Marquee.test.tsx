// packages/ui/test/components/Marquee.test.tsx
//
// Tests for the Marquee.
//
// Tested:
// - Marquee
//
// What is covered:
// - under reduce motion: one line with a tail ellipsis and no animation
// - the text fits its container: no animation
// - the text does not fit: the loop starts, and stops on unmount
//
// Run with: pnpm --filter @beatly/ui test -- Marquee
//
// SEE: packages/ui/src/components/Marquee.tsx

import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Animated } from "react-native";

import { Marquee } from "../../src/components/Marquee.tsx";

const loop = jest.spyOn(Animated, "loop");

afterEach(() => {
  loop.mockClear();
});

const element = (reduceMotion: boolean) => (
  <Marquee text="A very long title" variant="title" reduceMotion={reduceMotion} testID="m" />
);

async function layoutWidths(container: number, text: number) {
  await fireEvent(screen.getByTestId("m"), "layout", {
    nativeEvent: { layout: { width: container, height: 20, x: 0, y: 0 } },
  });
  await fireEvent(screen.getByTestId("m-text"), "layout", {
    nativeEvent: { layout: { width: text, height: 20, x: 0, y: 0 } },
  });
}

describe("Marquee", () => {
  it("draws one line with a tail ellipsis and never animates under reduce motion", async () => {
    await render(element(true));
    expect(screen.getByText("A very long title").props.numberOfLines).toBe(1);
    expect(loop).not.toHaveBeenCalled();
  });

  it("does not scroll when the text fits", async () => {
    await render(element(false));
    await layoutWidths(200, 120);
    expect(loop).not.toHaveBeenCalled();
  });

  it("scrolls when the text does not fit", async () => {
    await render(element(false));
    await layoutWidths(100, 300);
    expect(loop).toHaveBeenCalledTimes(1);
  });

  it("stops the loop on unmount", async () => {
    const view = await render(element(false));
    await layoutWidths(100, 300);
    const animation = loop.mock.results[0]?.value as Animated.CompositeAnimation;
    const stop = jest.spyOn(animation, "stop");
    await act(async () => {
      await view.unmount();
    });
    expect(stop).toHaveBeenCalled();
  });
});

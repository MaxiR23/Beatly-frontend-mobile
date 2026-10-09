// packages/ui/test/components/PlayButton.test.tsx
//
// Tests for the PlayButton.
//
// Tested:
// - PlayButton
//
// What is covered:
// - the four states: idle pill with glyph and label, loading circle with a spinner, playing pause, paused play, and their labels
// - the disabled pill on the control surface, loading ignoring presses, the press in idle, playing and paused
// - the pill `layout.playButtonPill` wide; leaving idle, the label fade then the eased shrink to the circle with the motion.playButton tokens, with no measurement, the play glyph alone while shrinking, never cut by a state change, then the spinner or the pause glyph with its scale-in; back to the pill when it returns to idle mid-way; nothing animates under reduce motion
//
// Run with: pnpm --filter @beatly/ui test -- PlayButton
//
// SEE: packages/ui/src/components/PlayButton.tsx

import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen, within } from "@testing-library/react-native";
import { Animated } from "react-native";

import { PlayButton, type PlayButtonState } from "../../src/components/PlayButton.tsx";
import { color } from "../../src/tokens/color.ts";
import { motion } from "../../src/tokens/motion.ts";
import { layout } from "../../src/tokens/spacing.ts";

const timing = jest.spyOn(Animated, "timing");

afterEach(() => {
  timing.mockClear();
});

type Done = (result: { finished: boolean }) => void;
// Holds the next animation until the test finishes it, as PullUpSheet.test.tsx does.
const hold = () => {
  const held: { finish: Done | undefined } = { finish: undefined };
  timing.mockImplementationOnce(
    () =>
      ({
        start: (done?: Done) => {
          held.finish = done;
        },
        stop: () => {
          held.finish?.({ finished: false });
        },
      }) as unknown as Animated.CompositeAnimation,
  );
  return held;
};

const element = (
  state: PlayButtonState,
  options: { disabled?: boolean; reduceMotion?: boolean; onPress?: () => void } = {},
) => (
  <PlayButton
    state={state}
    playLabel="Play"
    pauseLabel="Pause"
    disabled={options.disabled ?? false}
    reduceMotion={options.reduceMotion ?? false}
    onPress={options.onPress ?? jest.fn()}
  />
);

describe("PlayButton", () => {
  it("draws idle as an accent pill with the play glyph and the label, labelled play", async () => {
    await render(element("idle"));
    const button = screen.getByRole("button", { name: "Play" });
    expect(within(button).getByText("Play")).toBeTruthy();
    expect(screen.getByTestId("play-button-pill")).toHaveStyle({
      width: layout.playButtonPill,
      height: layout.playButtonMedium,
      backgroundColor: color.accent.primary,
    });
    expect(button.props.accessibilityState).toEqual({ disabled: false, busy: false });
  });

  it("draws loading as a circle with a spinner, busy and disabled", async () => {
    await render(element("loading"));
    const button = screen.getByRole("button", { name: "Play" });
    expect(button.props.accessibilityState).toEqual({ disabled: true, busy: true });
    expect(within(button).getByTestId("play-button-busy")).toBeTruthy();
    expect(within(button).queryByText("Play")).toBeNull();
    expect(screen.getByTestId("play-button-pill")).toHaveStyle({ width: layout.playButtonMedium });
  });

  it("draws playing as a circle with the pause glyph, labelled pause", async () => {
    await render(element("playing"));
    const button = screen.getByRole("button", { name: "Pause" });
    expect(within(button).getByTestId("play-button-pause")).toBeTruthy();
    expect(within(button).queryByText("Play")).toBeNull();
    expect(screen.getByTestId("play-button-pill")).toHaveStyle({ width: layout.playButtonMedium });
  });

  it("draws paused as a circle with the play glyph, labelled play", async () => {
    await render(element("paused"));
    const button = screen.getByRole("button", { name: "Play" });
    expect(within(button).getByTestId("play-button-play")).toBeTruthy();
    expect(within(button).queryByText("Play")).toBeNull();
  });

  it("draws the disabled pill on the control surface and ignores presses", async () => {
    const onPress = jest.fn();
    await render(element("idle", { disabled: true, onPress }));
    const button = screen.getByRole("button", { name: "Play" });
    expect(screen.getByTestId("play-button-pill")).toHaveStyle({
      backgroundColor: color.surface.control,
    });
    expect(button.props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("calls onPress when idle, playing and paused, and not while loading", async () => {
    const onPress = jest.fn();
    const view = await render(element("idle", { onPress }));
    await fireEvent.press(screen.getByRole("button"));
    await view.rerender(element("playing", { onPress }));
    await fireEvent.press(screen.getByRole("button"));
    await view.rerender(element("paused", { onPress }));
    await fireEvent.press(screen.getByRole("button"));
    expect(onPress).toHaveBeenCalledTimes(3);
    await view.rerender(element("loading", { onPress }));
    await fireEvent.press(screen.getByRole("button"));
    expect(onPress).toHaveBeenCalledTimes(3);
  });

  it("fades the label, then shrinks the pill to the circle, with no measurement", async () => {
    const view = await render(element("idle"));
    const fade = hold();
    const shrink = hold();
    await view.rerender(element("loading"));
    expect(timing).toHaveBeenCalledTimes(1);
    expect(timing).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        toValue: 0,
        duration: motion.playButton.labelFade,
        useNativeDriver: true,
      }),
    );
    expect(screen.getByTestId("play-button-label")).toBeTruthy();
    expect(screen.getByText("Play")).toBeTruthy();
    expect(screen.getByTestId("play-button-pill")).toHaveStyle({ width: layout.playButtonPill });
    expect(screen.queryByTestId("play-button-busy")).toBeNull();
    await act(() => {
      fade.finish?.({ finished: true });
    });
    expect(timing).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        toValue: layout.playButtonMedium,
        duration: motion.playButton.shrink,
        easing: expect.any(Function),
        useNativeDriver: false,
      }),
    );
    expect(screen.getByTestId("play-button-shrink")).toBeTruthy();
    expect(screen.queryByText("Play")).toBeNull();
    expect(screen.queryByTestId("play-button-busy")).toBeNull();
    await act(() => {
      shrink.finish?.({ finished: true });
    });
    expect(screen.getByTestId("play-button-busy")).toBeTruthy();
  });

  it("scales in from enterScale when it starts playing", async () => {
    const view = await render(element("loading"));
    timing.mockClear();
    hold();
    await view.rerender(element("playing"));
    expect(timing).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        toValue: 1,
        duration: motion.playButton.scaleIn,
        useNativeDriver: true,
      }),
    );
    expect(screen.getByTestId("play-button-pause")).toBeTruthy();
  });

  it("neither fades, shrinks nor scales under reduce motion", async () => {
    const view = await render(element("idle", { reduceMotion: true }));
    await view.rerender(element("loading", { reduceMotion: true }));
    await view.rerender(element("playing", { reduceMotion: true }));
    expect(timing).not.toHaveBeenCalled();
    expect(screen.getByTestId("play-button-pill")).toHaveStyle({ width: layout.playButtonMedium });
    expect(screen.getByRole("button", { name: "Pause" }).children[0]).toHaveStyle({
      transform: [{ scale: 1 }],
    });
  });

  it("does not cut the chain when loading turns to playing, and scales in only after it", async () => {
    const view = await render(element("idle"));
    const fade = hold();
    const shrink = hold();
    await view.rerender(element("loading"));
    await view.rerender(element("playing"));
    expect(timing).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("play-button-pause")).toBeNull();
    await act(() => {
      fade.finish?.({ finished: true });
    });
    expect(timing).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId("play-button-pause")).toBeNull();
    await act(() => {
      shrink.finish?.({ finished: true });
    });
    expect(screen.getByTestId("play-button-pause")).toBeTruthy();
    expect(timing).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        toValue: 1,
        duration: motion.playButton.scaleIn,
        useNativeDriver: true,
      }),
    );
  });

  it("runs the chain even when it goes straight from idle to playing", async () => {
    const view = await render(element("idle"));
    const fade = hold();
    const shrink = hold();
    await view.rerender(element("playing"));
    await act(() => {
      fade.finish?.({ finished: true });
    });
    await act(() => {
      shrink.finish?.({ finished: true });
    });
    expect(screen.getByTestId("play-button-pause")).toBeTruthy();
    expect(timing).toHaveBeenCalledTimes(3);
  });

  it("draws the pill again when it returns to idle during the fade", async () => {
    const view = await render(element("idle"));
    hold();
    await view.rerender(element("loading"));
    await view.rerender(element("idle"));
    expect(within(screen.getByRole("button")).getByText("Play")).toBeTruthy();
    expect(screen.getByTestId("play-button-pill")).toHaveStyle({ width: layout.playButtonPill });
    expect(timing).toHaveBeenCalledTimes(1);
  });

  it("draws the pill again when it returns to idle during the shrink", async () => {
    const view = await render(element("idle"));
    const fade = hold();
    hold();
    await view.rerender(element("loading"));
    await act(() => {
      fade.finish?.({ finished: true });
    });
    expect(screen.getByTestId("play-button-shrink")).toBeTruthy();
    await view.rerender(element("idle"));
    expect(within(screen.getByRole("button")).getByText("Play")).toBeTruthy();
    expect(screen.getByTestId("play-button-pill")).toHaveStyle({ width: layout.playButtonPill });
    expect(timing).toHaveBeenCalledTimes(2);
  });

  it("stops the chain when it unmounts", async () => {
    const view = await render(element("idle"));
    const fade = hold();
    await view.rerender(element("loading"));
    const spy = jest.fn(fade.finish);
    fade.finish = spy;
    await view.unmount();
    expect(spy).toHaveBeenCalledWith({ finished: false });
    expect(timing).toHaveBeenCalledTimes(1);
  });
});

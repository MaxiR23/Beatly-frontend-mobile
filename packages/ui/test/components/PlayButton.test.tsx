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
// - the shrink from the measured pill width and the scale-in, with the motion tokens, and neither under reduce motion
//
// Run with: pnpm --filter @beatly/ui test -- PlayButton
//
// SEE: packages/ui/src/components/PlayButton.tsx

import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, within } from "@testing-library/react-native";
import { Animated } from "react-native";

import { PlayButton, type PlayButtonState } from "../../src/components/PlayButton.tsx";
import { color } from "../../src/tokens/color.ts";
import { motion } from "../../src/tokens/motion.ts";
import { layout } from "../../src/tokens/spacing.ts";

const timing = jest.spyOn(Animated, "timing");

afterEach(() => {
  timing.mockClear();
});

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

  it("shrinks from the measured pill width to the circle when it leaves idle", async () => {
    const view = await render(element("idle"));
    await fireEvent(screen.getByTestId("play-button-pill"), "layout", {
      nativeEvent: { layout: { width: 160, height: layout.playButtonMedium } },
    });
    await view.rerender(element("loading"));
    expect(timing).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        toValue: layout.playButtonMedium,
        duration: motion.duration.fast,
        useNativeDriver: false,
      }),
    );
  });

  it("scales in from enterScale when it starts playing", async () => {
    const view = await render(element("loading"));
    timing.mockClear();
    await view.rerender(element("playing"));
    expect(timing).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        toValue: 1,
        duration: motion.duration.fast,
        useNativeDriver: true,
      }),
    );
    expect(screen.getByTestId("play-button-pause")).toBeTruthy();
  });

  it("neither shrinks nor scales under reduce motion", async () => {
    const view = await render(element("idle", { reduceMotion: true }));
    await fireEvent(screen.getByTestId("play-button-pill"), "layout", {
      nativeEvent: { layout: { width: 160, height: layout.playButtonMedium } },
    });
    await view.rerender(element("loading", { reduceMotion: true }));
    await view.rerender(element("playing", { reduceMotion: true }));
    expect(timing).not.toHaveBeenCalled();
    expect(screen.getByTestId("play-button-pill")).toHaveStyle({ width: layout.playButtonMedium });
    expect(screen.getByRole("button", { name: "Pause" }).children[0]).toHaveStyle({
      transform: [{ scale: 1 }],
    });
  });
});

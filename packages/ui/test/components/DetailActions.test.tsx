// packages/ui/test/components/DetailActions.test.tsx
//
// Tests for the DetailActions row.
//
// Tested:
// - DetailActions
//
// What is covered:
// - shuffle, play and save in order, centered with the layout gap; no save without save; the save toggle state and label
// - a press on an idle play starts, on a playing or paused one toggles
// - the start buttons disabled with no playable track, while pages load for either one, and play alone while its stream loads
// - the presses, and a disabled save ignoring them
// - the options node after play, and none without it, still pressable with no playable track
//
// Run with: pnpm --filter @beatly/ui test -- DetailActions
//
// SEE: packages/ui/src/components/DetailActions.tsx

import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, within } from "@testing-library/react-native";
import { Pressable } from "react-native";

import { DetailActions } from "../../src/components/DetailActions.tsx";
import { layout } from "../../src/tokens/spacing.ts";

type Props = Parameters<typeof DetailActions>[0];

function propsWithoutSave(overrides: Partial<Props> = {}): Props {
  return {
    play: {
      state: "idle",
      label: "Play",
      pauseLabel: "Pause",
      busy: false,
      onStart: jest.fn(),
      onToggle: jest.fn(),
    },
    shuffle: { label: "Shuffle", busy: false, onPress: jest.fn() },
    disabled: false,
    reduceMotion: false,
    testID: "actions",
    ...overrides,
  };
}

function props(overrides: Partial<Props> = {}) {
  return {
    ...propsWithoutSave(),
    save: { label: "Save", saved: false, disabled: false, onPress: jest.fn() },
    ...overrides,
  };
}

const labels = () =>
  screen.getAllByRole("button").map((b) => b.props.accessibilityLabel as unknown);

describe("DetailActions", () => {
  it("draws shuffle, play and save in order, centered with the layout gap", async () => {
    await render(<DetailActions {...props()} />);
    expect(labels()).toEqual(["Shuffle", "Play", "Save"]);
    expect(screen.getByTestId("actions")).toHaveStyle({
      flexDirection: "row",
      justifyContent: "center",
      gap: layout.gap,
    });
  });

  it("draws shuffle and play only without save", async () => {
    await render(<DetailActions {...propsWithoutSave()} />);
    expect(labels()).toEqual(["Shuffle", "Play"]);
  });

  it("draws the saved state with its own label", async () => {
    await render(
      <DetailActions
        {...props({ save: { label: "Remove", saved: true, disabled: false, onPress: jest.fn() } })}
      />,
    );
    expect(screen.getByRole("button", { name: "Remove" }).props.accessibilityState).toMatchObject({
      selected: true,
    });
  });

  it("starts on an idle play and toggles a playing or paused one", async () => {
    const p = props();
    const view = await render(<DetailActions {...p} />);
    await fireEvent.press(screen.getByRole("button", { name: "Play" }));
    expect(p.play.onStart).toHaveBeenCalledTimes(1);
    expect(p.play.onToggle).not.toHaveBeenCalled();
    await view.rerender(<DetailActions {...p} play={{ ...p.play, state: "playing" }} />);
    await fireEvent.press(screen.getByRole("button", { name: "Pause" }));
    await view.rerender(<DetailActions {...p} play={{ ...p.play, state: "paused" }} />);
    await fireEvent.press(screen.getByRole("button", { name: "Play" }));
    expect(p.play.onToggle).toHaveBeenCalledTimes(2);
    expect(p.play.onStart).toHaveBeenCalledTimes(1);
  });

  it("disables both start buttons with no playable track", async () => {
    const p = props({ disabled: true });
    await render(<DetailActions {...p} />);
    for (const name of ["Play", "Shuffle"]) {
      const button = screen.getByRole("button", { name });
      expect(button.props.accessibilityState).toMatchObject({ disabled: true });
      await fireEvent.press(button);
    }
    expect(p.play.onStart).not.toHaveBeenCalled();
    expect(p.shuffle.onPress).not.toHaveBeenCalled();
  });

  it("draws play loading and disables both starts while its pages load", async () => {
    const p = props();
    await render(<DetailActions {...p} play={{ ...p.play, busy: true }} />);
    const play = screen.getByRole("button", { name: "Play" });
    const shuffle = screen.getByRole("button", { name: "Shuffle" });
    expect(play.props.accessibilityState).toMatchObject({ disabled: true, busy: true });
    expect(shuffle.props.accessibilityState).toMatchObject({ disabled: true });
    expect(within(play).getByTestId("play-button-busy")).toBeTruthy();
    expect(within(shuffle).queryByTestId("icon-button-busy")).toBeNull();
  });

  it("disables both starts while shuffle loads its pages", async () => {
    const p = props();
    await render(<DetailActions {...p} shuffle={{ ...p.shuffle, busy: true }} />);
    const shuffle = screen.getByRole("button", { name: "Shuffle" });
    expect(screen.getByRole("button", { name: "Play" }).props.accessibilityState).toMatchObject({
      disabled: true,
    });
    expect(shuffle.props.accessibilityState).toMatchObject({ disabled: true, busy: true });
    expect(within(shuffle).getByTestId("icon-button-busy")).toBeTruthy();
  });

  it("disables play only while this list's stream loads", async () => {
    const p = props();
    await render(<DetailActions {...p} play={{ ...p.play, state: "loading" }} />);
    expect(screen.getByRole("button", { name: "Play" }).props.accessibilityState).toMatchObject({
      disabled: true,
    });
    expect(screen.getByRole("button", { name: "Shuffle" }).props.accessibilityState).toMatchObject({
      disabled: false,
    });
  });

  it("calls the callbacks on press", async () => {
    const p = props();
    await render(<DetailActions {...p} />);
    await fireEvent.press(screen.getByRole("button", { name: "Shuffle" }));
    await fireEvent.press(screen.getByRole("button", { name: "Save" }));
    expect(p.shuffle.onPress).toHaveBeenCalledTimes(1);
    expect(p.save.onPress).toHaveBeenCalledTimes(1);
  });

  it("ignores presses on a disabled save", async () => {
    const p = props({ save: { label: "Save", saved: false, disabled: true, onPress: jest.fn() } });
    await render(<DetailActions {...p} />);
    await fireEvent.press(screen.getByRole("button", { name: "Save" }));
    expect(p.save.onPress).not.toHaveBeenCalled();
  });

  it("draws the options node after play", async () => {
    await render(
      <DetailActions
        {...propsWithoutSave({
          options: <Pressable accessibilityRole="button" accessibilityLabel="Options" />,
        })}
      />,
    );
    expect(labels()).toEqual(["Shuffle", "Play", "Options"]);
  });

  it("keeps the options node enabled when there is no playable track", async () => {
    const onPress = jest.fn();
    await render(
      <DetailActions
        {...propsWithoutSave({
          disabled: true,
          options: (
            <Pressable accessibilityRole="button" accessibilityLabel="Options" onPress={onPress} />
          ),
        })}
      />,
    );
    await fireEvent.press(screen.getByRole("button", { name: "Options" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

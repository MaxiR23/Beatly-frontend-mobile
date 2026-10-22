// packages/ui/test/components/DetailActions.test.tsx
//
// Tests for the DetailActions row.
//
// Tested:
// - DetailActions
//
// What is covered:
// - centered: shuffle, play and save in order, a group centered with `layout.gap`; no save without save; the save toggle state and label
// - a press on an idle play starts, on a playing or paused one toggles
// - the start buttons disabled with no playable track, while pages load for either one, and play alone while its stream loads
// - the side buttons following the shrink value toward the center, `layout.controlHeight` square, starting at the circle when mounted playing
// - the side buttons stacked above the play slot (`layout.sideButtonStack`)
// - shuffle disabled on its own (fewer than two tracks) in both variants, in the disabled tone, ignoring presses and announced, with play unchanged
// - the presses, and a disabled save ignoring them
// - wide (liked): play and shuffle pills filling the row with `layout.gap`, the play pill's glyph and label per state with no animation, its presses and the disabled and busy states
// - the options node after play (centered), and none without it, still pressable with no playable track
//
// Run with: pnpm --filter @beatly/ui test -- DetailActions
//
// SEE: packages/ui/src/components/DetailActions.tsx

import { describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen, within } from "@testing-library/react-native";
import { Animated, Pressable } from "react-native";

import { DetailActions } from "../../src/components/DetailActions.tsx";
import { color } from "../../src/tokens/color.ts";
import { layout } from "../../src/tokens/spacing.ts";

interface JsonNode {
  props: Record<string, unknown>;
  children: unknown;
}

function isJsonNode(value: unknown): value is JsonNode {
  return typeof value === "object" && value !== null && "props" in value;
}

// Collects, from the rendered tree, every svg root (an icon glyph), in order.
function glyphs(tree: unknown): JsonNode[] {
  const found: JsonNode[] = [];
  const visit = (node: unknown) => {
    if (Array.isArray(node)) node.forEach(visit);
    if (!isJsonNode(node)) return;
    if ("xmlns" in node.props) found.push(node);
    visit(node.children);
  };
  visit(tree);
  return found;
}

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
    shuffle: { label: "Shuffle", busy: false, disabled: false, onPress: jest.fn() },
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
  it("draws shuffle, play and save in order, centered with the gap", async () => {
    await render(<DetailActions {...props()} />);
    expect(labels()).toEqual(["Shuffle", "Play", "Save"]);
    expect(screen.getByTestId("actions")).toHaveStyle({
      flexDirection: "row",
      justifyContent: "center",
      gap: layout.gap,
    });
  });

  it("moves the side buttons with the shrink value toward the center", async () => {
    const travel = (layout.playButtonPill - layout.playButtonMedium) / 2;
    const p = props({ reduceMotion: true });
    const view = await render(<DetailActions {...p} />);
    expect(screen.getByTestId("detail-actions-leading")).toHaveStyle({
      transform: [{ translateX: 0 }],
    });
    expect(screen.getByTestId("detail-actions-trailing")).toHaveStyle({
      transform: [{ translateX: 0 }],
    });
    await view.unmount();
    await render(<DetailActions {...p} play={{ ...p.play, state: "playing" }} />);
    expect(screen.getByTestId("detail-actions-leading")).toHaveStyle({
      transform: [{ translateX: travel }],
    });
    expect(screen.getByTestId("detail-actions-trailing")).toHaveStyle({
      transform: [{ translateX: -travel }],
    });
    for (const name of ["Shuffle", "Save"]) {
      expect(screen.getByRole("button", { name })).toHaveStyle({
        width: layout.controlHeight,
        height: layout.controlHeight,
      });
    }
  });

  it("stacks the side buttons above the play slot so their taps win during the shrink", async () => {
    await render(<DetailActions {...props()} />);
    for (const id of ["detail-actions-leading", "detail-actions-trailing"]) {
      expect(screen.getByTestId(id)).toHaveStyle({ zIndex: layout.sideButtonStack });
    }
  });

  it("starts the side buttons at the circle when it mounts playing", async () => {
    const travel = (layout.playButtonPill - layout.playButtonMedium) / 2;
    const p = props();
    await render(<DetailActions {...p} play={{ ...p.play, state: "paused" }} />);
    expect(screen.getByTestId("detail-actions-leading")).toHaveStyle({
      transform: [{ translateX: travel }],
    });
  });

  it("drives the side buttons with the value the play button shrinks", async () => {
    const travel = (layout.playButtonPill - layout.playButtonMedium) / 2;
    const timing = jest.spyOn(Animated, "timing");
    const held: { finish: ((r: { finished: boolean }) => void) | undefined }[] = [];
    timing.mockImplementation(() => {
      const entry: (typeof held)[number] = { finish: undefined };
      held.push(entry);
      return {
        start: (done?: (r: { finished: boolean }) => void) => {
          entry.finish = done;
        },
        stop: jest.fn(),
      } as unknown as Animated.CompositeAnimation;
    });
    const p = props();
    const view = await render(<DetailActions {...p} />);
    await view.rerender(<DetailActions {...p} play={{ ...p.play, busy: true }} />);
    await act(() => {
      held[0]?.finish?.({ finished: true });
    });
    const shrinkValue = timing.mock.calls[1]?.[0];
    expect(shrinkValue).toBeInstanceOf(Animated.Value);
    await act(() => {
      (shrinkValue as Animated.Value).setValue(1);
    });
    await view.rerender(<DetailActions {...p} play={{ ...p.play, busy: true }} />);
    expect(screen.getByTestId("detail-actions-leading")).toHaveStyle({
      transform: [{ translateX: travel }],
    });
    timing.mockRestore();
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

  it("disables shuffle alone when it has fewer than two tracks", async () => {
    const p = props();
    await render(<DetailActions {...p} shuffle={{ ...p.shuffle, disabled: true }} />);
    const shuffle = screen.getByRole("button", { name: "Shuffle" });
    const play = screen.getByRole("button", { name: "Play" });
    expect(shuffle.props.accessibilityState).toMatchObject({ disabled: true });
    expect(play.props.accessibilityState).toMatchObject({ disabled: false });
    expect(glyphs(screen.toJSON())[0]?.props.stroke).toBe(color.text.disabled);
    expect(glyphs(screen.toJSON())[1]?.props.stroke).not.toBe(color.text.disabled);
    await fireEvent.press(shuffle);
    await fireEvent.press(play);
    await fireEvent.press(screen.getByRole("button", { name: "Save" }));
    expect(p.shuffle.onPress).not.toHaveBeenCalled();
    expect(p.play.onStart).toHaveBeenCalledTimes(1);
    expect(p.save.onPress).toHaveBeenCalledTimes(1);
  });

  it("disables the wide shuffle pill alone when it has fewer than two tracks", async () => {
    const p = props({ variant: "wide" });
    await render(<DetailActions {...p} shuffle={{ ...p.shuffle, disabled: true }} />);
    const shuffle = screen.getByRole("button", { name: "Shuffle" });
    const play = screen.getByRole("button", { name: "Play" });
    expect(shuffle.props.accessibilityState).toMatchObject({ disabled: true });
    expect(play.props.accessibilityState).toMatchObject({ disabled: false });
    expect(within(shuffle).getByText("Shuffle")).toHaveStyle({ color: color.text.disabled });
    expect(shuffle).toHaveStyle({ backgroundColor: color.surface.control });
    await fireEvent.press(shuffle);
    await fireEvent.press(play);
    expect(p.shuffle.onPress).not.toHaveBeenCalled();
    expect(p.play.onStart).toHaveBeenCalledTimes(1);
  });

  it("keeps shuffle disabled by the shared flags", async () => {
    const p = props({ disabled: true });
    await render(<DetailActions {...p} shuffle={{ ...p.shuffle, disabled: false }} />);
    expect(screen.getByRole("button", { name: "Shuffle" }).props.accessibilityState).toMatchObject({
      disabled: true,
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

  it("draws the wide row as a play pill then a shuffle pill sharing the row", async () => {
    await render(<DetailActions {...props({ variant: "wide" })} />);
    expect(labels()).toEqual(["Play", "Shuffle"]);
    expect(screen.getByTestId("actions")).toHaveStyle({
      flexDirection: "row",
      paddingHorizontal: layout.gutter,
      gap: layout.gap,
    });
    for (const name of ["Play", "Shuffle"]) {
      expect(screen.getByRole("button", { name })).toHaveStyle({
        flex: 1,
        height: layout.controlHeight,
      });
    }
    expect(screen.getByRole("button", { name: "Play" })).toHaveStyle({
      backgroundColor: color.accent.primary,
    });
    expect(screen.getByRole("button", { name: "Shuffle" })).toHaveStyle({
      backgroundColor: color.surface.control,
    });
  });

  it("swaps the wide play pill's glyph and label with the state, without animating", async () => {
    const timing = jest.spyOn(Animated, "timing");
    const p = props({ variant: "wide" });
    const view = await render(<DetailActions {...p} />);
    expect(within(screen.getByRole("button", { name: "Play" })).getByText("Play")).toBeTruthy();
    await view.rerender(<DetailActions {...p} play={{ ...p.play, state: "playing" }} />);
    expect(within(screen.getByRole("button", { name: "Pause" })).getByText("Pause")).toBeTruthy();
    await view.rerender(<DetailActions {...p} play={{ ...p.play, state: "paused" }} />);
    expect(within(screen.getByRole("button", { name: "Play" })).getByText("Play")).toBeTruthy();
    await view.rerender(<DetailActions {...p} play={{ ...p.play, busy: true }} />);
    const busy = screen.getByRole("button", { name: "Play" });
    expect(busy.props.accessibilityState).toMatchObject({ busy: true });
    expect(within(busy).queryByText("Play")).toBeNull();
    expect(timing).not.toHaveBeenCalled();
    timing.mockRestore();
  });

  it("starts on an idle wide play, toggles a playing one, and shuffles", async () => {
    const p = props({ variant: "wide" });
    const view = await render(<DetailActions {...p} />);
    await fireEvent.press(screen.getByRole("button", { name: "Play" }));
    await fireEvent.press(screen.getByRole("button", { name: "Shuffle" }));
    expect(p.play.onStart).toHaveBeenCalledTimes(1);
    expect(p.shuffle.onPress).toHaveBeenCalledTimes(1);
    await view.rerender(<DetailActions {...p} play={{ ...p.play, state: "playing" }} />);
    await fireEvent.press(screen.getByRole("button", { name: "Pause" }));
    expect(p.play.onToggle).toHaveBeenCalledTimes(1);
  });

  it("disables both wide pills with no playable track or while either loads its pages", async () => {
    const p = props({ variant: "wide", disabled: true });
    const view = await render(<DetailActions {...p} />);
    for (const name of ["Play", "Shuffle"]) {
      expect(screen.getByRole("button", { name }).props.accessibilityState).toMatchObject({
        disabled: true,
      });
    }
    await view.rerender(<DetailActions {...p} disabled={false} play={{ ...p.play, busy: true }} />);
    expect(screen.getByRole("button", { name: "Shuffle" }).props.accessibilityState).toMatchObject({
      disabled: true,
    });
    expect(screen.getByRole("button", { name: "Play" }).props.accessibilityState).toMatchObject({
      disabled: true,
      busy: true,
    });
    await view.rerender(
      <DetailActions {...p} disabled={false} shuffle={{ ...p.shuffle, busy: true }} />,
    );
    expect(screen.getByRole("button", { name: "Play" }).props.accessibilityState).toMatchObject({
      disabled: true,
    });
    expect(screen.getByRole("button", { name: "Shuffle" }).props.accessibilityState).toMatchObject({
      disabled: true,
      busy: true,
    });
  });
});

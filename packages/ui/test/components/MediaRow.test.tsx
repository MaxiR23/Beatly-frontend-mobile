// packages/ui/test/components/MediaRow.test.tsx
//
// Tests for the MediaRow.
//
// Tested:
// - MediaRow
//
// What is covered:
// - the title and subtitle in their tones, an unavailable row drawn disabled
// - a trailing element drawn outside the pressable body
// - the current track: bars in place of the number over the cover on a scrim, no row background, selected state, paused and reduce motion passed on, nothing without nowPlaying or on an unavailable row
// - an unavailable row never a button, announced as one element by its label (or the title), its trailing control still pressable
//
// Run with: pnpm --filter @beatly/ui test -- MediaRow
//
// SEE: packages/ui/src/components/MediaRow.tsx

import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { Animated, Pressable } from "react-native";

import { MediaRow } from "../../src/components/MediaRow.tsx";
import { color } from "../../src/tokens/color.ts";
import { motion } from "../../src/tokens/motion.ts";
import { radius } from "../../src/tokens/radius.ts";

describe("MediaRow", () => {
  it("draws the title and subtitle in their tones when available", async () => {
    await render(<MediaRow title="Song" subtitle="Album" urls={[]} shape="square" testID="row" />);
    expect(screen.getByText("Song")).toHaveStyle({ color: color.text.primary });
    expect(screen.getByText("Album")).toHaveStyle({ color: color.text.secondary });
    expect(screen.getByTestId("row").props.accessibilityState).toBeUndefined();
  });

  it("draws an unavailable row disabled", async () => {
    await render(
      <MediaRow
        title="Hidden"
        subtitle="Album"
        urls={[]}
        shape="square"
        available={false}
        testID="row"
      />,
    );
    expect(screen.getByText("Hidden")).toHaveStyle({ color: color.text.disabled });
    expect(screen.getByText("Album")).toHaveStyle({ color: color.text.disabled });
    expect(screen.getByTestId("row").props.accessibilityState).toEqual({ disabled: true });
  });

  it("renders the trailing element outside the pressable body", async () => {
    const onPress = jest.fn();
    const onMore = jest.fn();
    await render(
      <MediaRow
        title="Song"
        urls={[]}
        shape="square"
        onPress={onPress}
        trailing={
          <Pressable accessibilityRole="button" accessibilityLabel="More" onPress={onMore} />
        }
      />,
    );
    await fireEvent.press(screen.getByRole("button", { name: "More" }));
    expect(onMore).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole("button", { name: "Song" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("never makes an unavailable row a button, even with onPress", async () => {
    await render(
      <MediaRow title="Hidden" urls={[]} shape="square" available={false} onPress={jest.fn()} />,
    );
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("announces an unavailable row as one element by its unavailable label", async () => {
    await render(
      <MediaRow
        title="Hidden"
        urls={[]}
        shape="square"
        available={false}
        unavailableLabel="Hidden, not available"
        testID="row"
      />,
    );
    expect(screen.getByLabelText("Hidden, not available")).toBeTruthy();
    const row = screen.getByTestId("row");
    expect(row.props.accessible).toBe(true);
    expect(row.props.accessibilityState).toEqual({ disabled: true });
  });

  it("falls back to the title without an unavailable label", async () => {
    await render(<MediaRow title="Hidden" urls={[]} shape="square" available={false} />);
    expect(screen.getByLabelText("Hidden")).toBeTruthy();
  });

  it("keeps the trailing control pressable on an unavailable row whose body is not a button", async () => {
    const onMore = jest.fn();
    await render(
      <MediaRow
        title="Hidden"
        urls={[]}
        shape="square"
        available={false}
        onPress={jest.fn()}
        trailing={
          <Pressable accessibilityRole="button" accessibilityLabel="More" onPress={onMore} />
        }
      />,
    );
    expect(screen.getAllByRole("button")).toHaveLength(1);
    await fireEvent.press(screen.getByRole("button", { name: "More" }));
    expect(onMore).toHaveBeenCalledTimes(1);
  });

  it("draws the bars over the cover with no background on the row while playing", async () => {
    await render(
      <MediaRow
        title="Song"
        urls={[]}
        shape="square"
        nowPlaying="playing"
        onPress={jest.fn()}
        testID="row"
      />,
    );
    expect(screen.getByTestId("now-playing-bars")).toBeTruthy();
    const row = screen.getByTestId("row");
    expect(row).not.toHaveStyle({ backgroundColor: color.overlay.subtle });
    expect(row.props.accessibilityState).toEqual({ selected: true });
  });

  it("draws the scrim over the cover in overlay.onImage, round for a round cover", async () => {
    const view = await render(
      <MediaRow title="Song" urls={[]} shape="square" nowPlaying="playing" />,
    );
    const scrim = screen.getByTestId("now-playing-bars").parent;
    expect(scrim).toHaveStyle({ backgroundColor: color.overlay.onImage, borderRadius: radius.sm });
    await view.rerender(<MediaRow title="Song" urls={[]} shape="round" nowPlaying="playing" />);
    expect(screen.getByTestId("now-playing-bars").parent).toHaveStyle({
      borderRadius: radius.full,
    });
  });

  it("does the same with a trailing control", async () => {
    await render(
      <MediaRow
        title="Song"
        urls={[]}
        shape="square"
        nowPlaying="paused"
        onPress={jest.fn()}
        trailing={<Pressable accessibilityRole="button" accessibilityLabel="More" />}
        testID="row"
      />,
    );
    expect(screen.getByTestId("now-playing-bars")).toBeTruthy();
    expect(screen.getByTestId("row")).not.toHaveStyle({ backgroundColor: color.overlay.subtle });
    expect(screen.getByRole("button", { name: "Song" }).props.accessibilityState).toEqual({
      selected: true,
    });
  });

  it("passes paused and reduce motion to the bars", async () => {
    const loop = jest.spyOn(Animated, "loop");
    loop.mockClear();
    await render(
      <MediaRow title="Song" urls={[]} shape="square" nowPlaying="playing" reduceMotion />,
    );
    expect(loop).not.toHaveBeenCalled();
    screen.getAllByTestId("now-playing-bar").forEach((bar, index) => {
      expect(bar).toHaveStyle({
        transform: [{ scaleY: motion.nowPlaying.staticScales[index] ?? 1 }],
      });
    });
    loop.mockRestore();
  });

  it("draws no bars without nowPlaying", async () => {
    await render(<MediaRow title="Song" urls={[]} shape="square" testID="row" />);
    expect(screen.queryByTestId("now-playing-bars")).toBeNull();
    expect(screen.getByTestId("row")).not.toHaveStyle({ backgroundColor: color.overlay.subtle });
  });

  it("ignores nowPlaying on an unavailable row", async () => {
    await render(
      <MediaRow title="Song" urls={[]} shape="square" available={false} nowPlaying="playing" />,
    );
    expect(screen.queryByTestId("now-playing-bars")).toBeNull();
  });
});

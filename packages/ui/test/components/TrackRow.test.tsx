// packages/ui/test/components/TrackRow.test.tsx
//
// Tests for the TrackRow.
//
// Tested:
// - TrackRow
//
// What is covered:
// - the number, title and artists drawn, an unavailable track marked as disabled
// - a button named by the title with onPress, no button role without it
// - a trailing element drawn outside the pressable body
//
// Run with: pnpm --filter @beatly/ui test -- TrackRow
//
// SEE: packages/ui/src/components/TrackRow.tsx

import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { Pressable } from "react-native";

import { TrackRow } from "../../src/components/TrackRow.tsx";
import { color } from "../../src/tokens/color.ts";

describe("TrackRow", () => {
  it("draws the number, the title and the artists", async () => {
    await render(<TrackRow number={3} title="Song" subtitle="Artist" available />);
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("Song")).toHaveStyle({ color: color.text.primary });
    expect(screen.getByText("Artist")).toBeTruthy();
  });

  it("marks an unavailable track as disabled", async () => {
    await render(<TrackRow number={4} title="Hidden" available={false} testID="row" />);
    expect(screen.getByText("Hidden")).toHaveStyle({ color: color.text.disabled });
    expect(screen.getByText("4")).toHaveStyle({ color: color.text.disabled });
    expect(screen.getByTestId("row").props.accessibilityState).toEqual({ disabled: true });
  });

  it("is a button named by the title that calls onPress", async () => {
    const onPress = jest.fn();
    await render(<TrackRow number={1} title="Song" available onPress={onPress} />);
    await fireEvent.press(screen.getByRole("button", { name: "Song" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("has no button role without onPress", async () => {
    await render(<TrackRow number={1} title="Song" available />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders the trailing element outside the pressable body", async () => {
    const onPress = jest.fn();
    const onMore = jest.fn();
    await render(
      <TrackRow
        number={1}
        title="Song"
        available
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
});

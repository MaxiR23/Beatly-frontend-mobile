// packages/ui/test/components/MiniPlayer.test.tsx
//
// Tests for the MiniPlayer.
//
// Tested:
// - MiniPlayer
//
// What is covered:
// - the title and subtitle, the failed subtitle in the error tone, the open, toggle and next presses, the pause label while playing, no progress element
// - the bare surface: filling and clipping, no glass and no tint, with the presses still working
//
// Run with: pnpm --filter @beatly/ui test -- MiniPlayer
//
// SEE: packages/ui/src/components/MiniPlayer.tsx

import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ComponentProps } from "react";

import { MiniPlayer } from "../../src/components/MiniPlayer.tsx";
import { color } from "../../src/tokens/color.ts";

const labels = { open: "Open player", play: "Play", pause: "Pause", next: "Next" };

async function draw(over: Partial<ComponentProps<typeof MiniPlayer>> = {}) {
  const handlers = { onOpen: jest.fn(), onToggle: jest.fn(), onNext: jest.fn() };
  await render(
    <MiniPlayer
      title="Song"
      subtitle="Artist"
      failed={false}
      coverUrl={null}
      tint={null}
      playing={false}
      busy={false}
      labels={labels}
      {...handlers}
      {...over}
    />,
  );
  return handlers;
}

describe("MiniPlayer", () => {
  it("draws the title and the subtitle", async () => {
    await draw();
    expect(screen.getByText("Song")).toBeTruthy();
    expect(screen.getByText("Artist")).toHaveStyle({ color: color.text.secondary });
  });

  it("draws the failed subtitle in the error tone", async () => {
    await draw({ subtitle: "Can't play", failed: true });
    expect(screen.getByText("Can't play")).toHaveStyle({ color: color.status.error });
  });

  it("opens on the body, toggles on play and goes next", async () => {
    const h = await draw();
    await fireEvent.press(screen.getByRole("button", { name: "Open player" }));
    await fireEvent.press(screen.getByRole("button", { name: "Play" }));
    await fireEvent.press(screen.getByRole("button", { name: "Next" }));
    expect(h.onOpen).toHaveBeenCalledTimes(1);
    expect(h.onToggle).toHaveBeenCalledTimes(1);
    expect(h.onNext).toHaveBeenCalledTimes(1);
  });

  it("draws bare, filling and clipping to its container, without the glass surface or the tint", async () => {
    const h = await draw({ surface: "bare", tint: "#336699" });
    const bar = screen.getByTestId("mini-player");
    expect(bar).toHaveStyle({ flex: 1, overflow: "hidden" });
    expect(bar).not.toHaveStyle({ backgroundColor: color.surface.raised });
    expect(bar).not.toHaveStyle({ backgroundColor: "#336699" });
    await fireEvent.press(screen.getByRole("button", { name: "Open player" }));
    await fireEvent.press(screen.getByRole("button", { name: "Play" }));
    expect(h.onOpen).toHaveBeenCalledTimes(1);
    expect(h.onToggle).toHaveBeenCalledTimes(1);
  });

  it("shows the pause label while playing and draws no progress element", async () => {
    await draw({ playing: true });
    expect(screen.getByRole("button", { name: "Pause" })).toBeTruthy();
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.queryByRole("adjustable")).toBeNull();
  });
});

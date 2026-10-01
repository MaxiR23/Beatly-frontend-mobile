// apps/mobile/test/screens/player/MiniPlayerBar.test.tsx
//
// Tests for the mini player container.
//
// Tested:
// - MiniPlayerBar
//
// What is covered:
// - nothing drawn while idle, the title and joined artists after a start, the error line on a failure
// - the bare surface when asked, and the glass one by default
// - the body opening the player, play or pause and next reaching the controller
//
// Run with: pnpm --filter @beatly/mobile test -- MiniPlayerBar
//
// SEE: apps/mobile/src/screens/player/MiniPlayerBar.tsx

import type { PlayableTrack } from "@beatly/core";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { i18n } from "../../../src/adapters/i18n.ts";
import { resources } from "../../../src/i18n/resources.ts";
import { MiniPlayerBar } from "../../../src/screens/player/MiniPlayerBar.tsx";
import { makeCore, Wrapper } from "../../helpers/core.tsx";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("../../../src/adapters/imageColors.ts", () => ({
  getDominantColor: () => Promise.resolve({ kind: "unavailable" }),
  peekDominantColor: () => undefined,
}));

afterEach(async () => {
  mockPush.mockClear();
  await i18n.changeLanguage("en");
});

const en = resources.en;
const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const track = (id: string): PlayableTrack => ({
  trackId: id,
  title: `Song ${id}`,
  artists: [
    { id: "ar1", name: "Ann" },
    { id: "ar2", name: "Bob" },
  ],
  album: "Album",
  albumId: "a1",
  coverUrl: null,
  durationSeconds: 200,
});
const source = { kind: "album", id: "a1", name: "Album" } as const;

async function setup(options: Parameters<typeof makeCore>[0] = {}, surface?: "glass" | "bare") {
  const ctx = makeCore(options);
  await render(
    <Wrapper core={ctx.core}>
      <SafeAreaProvider initialMetrics={metrics}>
        {surface === undefined ? <MiniPlayerBar /> : <MiniPlayerBar surface={surface} />}
      </SafeAreaProvider>
    </Wrapper>,
  );
  return ctx;
}

async function start(ctx: Awaited<ReturnType<typeof setup>>) {
  await act(async () => {
    await ctx.playback.playList([track("1"), track("2")], 0, source);
  });
}

describe("MiniPlayerBar", () => {
  it("draws nothing while no track is loaded", async () => {
    await setup();
    expect(screen.queryByTestId("mini-player")).toBeNull();
  });

  it("draws the title and the artists joined once a track is loaded", async () => {
    const ctx = await setup();
    await start(ctx);
    expect(screen.getByText("Song 1")).toBeTruthy();
    expect(screen.getByText("Ann, Bob")).toBeTruthy();
  });

  it("draws the error line instead of the artists on a resolution failure", async () => {
    const ctx = await setup({
      resolve: () => Promise.resolve({ kind: "failure", cause: "unplayable" }),
    });
    await start(ctx);
    expect(screen.getByText(en.player.error.unplayable)).toBeTruthy();
    expect(screen.queryByText("Ann, Bob")).toBeNull();
  });

  it("draws bare when asked, and not by default", async () => {
    const bare = await setup({}, "bare");
    await start(bare);
    expect(screen.getByTestId("mini-player")).toHaveStyle({ overflow: "hidden" });
  });

  it("draws the glass surface by default", async () => {
    const ctx = await setup();
    await start(ctx);
    expect(screen.getByTestId("mini-player")).not.toHaveStyle({ overflow: "hidden" });
  });

  it("opens the player from the body", async () => {
    const ctx = await setup();
    await start(ctx);
    await fireEvent.press(screen.getByRole("button", { name: en.player.open }));
    expect(mockPush).toHaveBeenCalledWith("/player");
  });

  it("reaches the controller with play or pause and next", async () => {
    const ctx = await setup();
    await start(ctx);
    await act(() => {
      ctx.player.emit({
        type: "progress",
        positionSeconds: 1,
        durationSeconds: 200,
        playing: true,
        buffering: false,
      });
    });
    await fireEvent.press(screen.getByRole("button", { name: en.player.pause }));
    expect(ctx.playback.getState().status).toBe("paused");
    await fireEvent.press(screen.getByRole("button", { name: en.player.next }));
    expect(ctx.playback.getState().current?.trackId).toBe("2");
  });
});

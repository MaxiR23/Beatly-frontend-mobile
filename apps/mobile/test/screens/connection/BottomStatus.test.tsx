// apps/mobile/test/screens/connection/BottomStatus.test.tsx
//
// Tests for the bottom status strip.
//
// Tested:
// - BottomStatus
//
// What is covered:
// - a playback resolution failure draws its reason and a press asks the resolver again
// - offline with no track draws the offline line, with no press; online again removes it
// - offline and failed draws one strip only, and it stays after the connection returns, never retrying by itself
// - a play-all that could not start offline draws the offline playback strip, a press runs its retry, and another source starting drops it
//
// Run with: pnpm --filter @beatly/mobile test -- BottomStatus
//
// SEE: apps/mobile/src/screens/connection/BottomStatus.tsx

import type { PlayableTrack } from "@beatly/core";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { onlineManager } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { resources } from "../../../src/i18n/resources.ts";
import { BottomStatus } from "../../../src/screens/connection/BottomStatus.tsx";
import {
  clearPlayStart,
  failPlayStart,
  getPlayStartFailure,
} from "../../../src/screens/connection/playStart.ts";
import { makeCore, Wrapper } from "../../helpers/core.tsx";

const en = resources.en;

const track = (id: string): PlayableTrack => ({
  trackId: id,
  title: `Song ${id}`,
  artists: [{ id: "ar1", name: "Ann" }],
  album: "Album",
  albumId: "a1",
  coverUrl: null,
  image: null,
  durationSeconds: 200,
});
const source = { kind: "album", id: "a1", name: "Album" } as const;

afterEach(() => {
  onlineManager.setOnline(true);
  clearPlayStart("p");
});

async function setup(options: Parameters<typeof makeCore>[0] = {}) {
  const ctx = makeCore(options);
  await render(
    <Wrapper core={ctx.core}>
      <BottomStatus />
    </Wrapper>,
  );
  return ctx;
}

const start = (ctx: Awaited<ReturnType<typeof setup>>) =>
  act(async () => {
    await ctx.playback.playList([track("1"), track("2")], 0, source);
  });

const setOnline = (online: boolean) =>
  act(() => {
    onlineManager.setOnline(online);
  });

describe("BottomStatus", () => {
  it("draws the slow reason of a resolution failure and a press asks the resolver again", async () => {
    const ctx = await setup({
      resolve: () => Promise.resolve({ kind: "failure", cause: "timeout" }),
    });
    await start(ctx);
    expect(screen.getByText(en.player.strip.slow)).toBeTruthy();
    const before = ctx.resolve.mock.calls.length;
    await act(async () => {
      await fireEvent.press(screen.getByRole("button", { name: en.player.strip.slow }));
    });
    expect(ctx.resolve.mock.calls.length).toBeGreaterThan(before);
  });

  it("draws the generic reason for an unplayable track", async () => {
    const ctx = await setup({
      resolve: () => Promise.resolve({ kind: "failure", cause: "unplayable" }),
    });
    await start(ctx);
    expect(screen.getByText(en.player.strip.failed)).toBeTruthy();
  });

  it("draws the offline line with no track, as a plain alert, and removes it when back online", async () => {
    await setup();
    expect(screen.queryByTestId("status-strip")).toBeNull();
    await setOnline(false);
    expect(screen.getByText(en.common.connection.offline)).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
    await setOnline(true);
    expect(screen.queryByTestId("status-strip")).toBeNull();
  });

  it("draws one strip when offline and failed", async () => {
    const ctx = await setup({
      resolve: () => Promise.resolve({ kind: "failure", cause: "network" }),
    });
    await start(ctx);
    await setOnline(false);
    expect(screen.getAllByTestId("status-strip")).toHaveLength(1);
    expect(screen.getByText(en.player.strip.offline)).toBeTruthy();
  });

  it("keeps the offline playback strip after the connection returns and does not retry by itself", async () => {
    const ctx = await setup({
      resolve: () => Promise.resolve({ kind: "failure", cause: "network" }),
    });
    await start(ctx);
    await setOnline(false);
    await setOnline(true);
    expect(screen.getByText(en.player.strip.offline)).toBeTruthy();
    const calls = ctx.resolve.mock.calls.length;
    await act(async () => {
      await fireEvent.press(screen.getByRole("button", { name: en.player.strip.offline }));
    });
    expect(ctx.resolve.mock.calls.length).toBe(calls + 1);
  });

  it("draws the play-start failure and runs its retry on a press", async () => {
    const ctx = await setup();
    await start(ctx);
    const retry = jest.fn();
    await act(() => {
      failPlayStart({ owner: "p", sourceStart: ctx.playback.getState().sourceStart, retry });
    });
    await fireEvent.press(screen.getByRole("button", { name: en.player.strip.offline }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(getPlayStartFailure()).toBeNull();
    expect(screen.queryByTestId("status-strip")).toBeNull();
  });

  it("drops the play-start failure when another source starts", async () => {
    const ctx = await setup();
    await start(ctx);
    await act(() => {
      failPlayStart({
        owner: "p",
        sourceStart: ctx.playback.getState().sourceStart,
        retry: () => undefined,
      });
    });
    expect(screen.getByText(en.player.strip.offline)).toBeTruthy();
    await act(async () => {
      await ctx.playback.playList([track("3")], 0, source);
    });
    expect(screen.queryByTestId("status-strip")).toBeNull();
  });
});

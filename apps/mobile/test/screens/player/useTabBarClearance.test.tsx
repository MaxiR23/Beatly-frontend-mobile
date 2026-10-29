// apps/mobile/test/screens/player/useTabBarClearance.test.tsx
//
// Tests for the tab screens' bottom clearance.
//
// Tested:
// - useTabBarClearance
//
// What is covered:
// - inside a native tab, the clearance is built on the window's bottom inset (34), not the tab's (83), without and with a track loaded
//
// Run with: pnpm --filter @beatly/mobile test -- useTabBarClearance
//
// SEE: apps/mobile/src/screens/player/useTabBarClearance.ts

import type { PlayableTrack } from "@beatly/core";
import { describe, expect, it } from "@jest/globals";
import { floatingTabBarClearance } from "@beatly/ui/native";
import { act, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { useTabBarClearance } from "../../../src/screens/player/useTabBarClearance.ts";
import { makeCore, Wrapper } from "../../helpers/core.tsx";
import { Insets, windowMetrics } from "../../helpers/insets.tsx";

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

function Probe() {
  return <Text testID="clearance">{String(useTabBarClearance())}</Text>;
}

async function setup() {
  const ctx = makeCore();
  await render(
    <Wrapper core={ctx.core}>
      <Insets tab>
        <Probe />
      </Insets>
    </Wrapper>,
  );
  return ctx;
}

describe("useTabBarClearance", () => {
  it("builds the clearance on the window's bottom inset inside a native tab", async () => {
    await setup();
    expect(screen.getByTestId("clearance").props.children).toBe(
      String(floatingTabBarClearance(windowMetrics.insets.bottom, false)),
    );
  });

  it("adds the mini player's clearance on the window's bottom inset when a track is loaded", async () => {
    const ctx = await setup();
    await act(async () => {
      await ctx.playback.playList([track("1")], 0, source);
    });
    expect(screen.getByTestId("clearance").props.children).toBe(
      String(floatingTabBarClearance(windowMetrics.insets.bottom, true)),
    );
  });
});

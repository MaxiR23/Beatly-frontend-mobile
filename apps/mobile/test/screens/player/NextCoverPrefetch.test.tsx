// apps/mobile/test/screens/player/NextCoverPrefetch.test.tsx
//
// Tests for the next cover's prefetch.
//
// Tested:
// - NextCoverPrefetch
//
// What is covered:
// - the next queued track's cover prefetched at the player's size when a list starts and again on every track change
// - nothing at the last track or for a next track without a cover
// - a failed or rejected prefetch logged, nothing else
//
// Run with: pnpm --filter @beatly/mobile test -- NextCoverPrefetch
//
// SEE: apps/mobile/src/screens/player/NextCoverPrefetch.tsx

import type { PlayableTrack } from "@beatly/core";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, render } from "@testing-library/react-native";
import { Dimensions } from "react-native";

import { NextCoverPrefetch } from "../../../src/screens/player/NextCoverPrefetch.tsx";
import { playerCoverSize } from "../../../src/screens/player/playerCover.ts";
import { makeCore, tiers, Wrapper } from "../../helpers/core.tsx";

const mockPrefetch = jest.fn<(image: unknown, points: number) => Promise<boolean>>();

jest.mock("@beatly/ui/native", () => {
  const actual = jest.requireActual<Record<string, unknown>>("@beatly/ui/native");
  return {
    ...actual,
    prefetchPicture: (image: unknown, points: number) => mockPrefetch(image, points),
  };
});

const track = (id: string, withCover = true): PlayableTrack => ({
  trackId: id,
  title: `Song ${id}`,
  artists: [{ id: "ar1", name: "Ann" }],
  album: "Album",
  albumId: "a1",
  coverUrl: null,
  image: withCover ? tiers(id) : null,
  durationSeconds: 248,
});
const album = { kind: "album", id: "a1", name: "Test Album" } as const;
const size = () => playerCoverSize(Dimensions.get("window").width);

async function setup() {
  const ctx = makeCore();
  await render(
    <Wrapper core={ctx.core}>
      <NextCoverPrefetch />
    </Wrapper>,
  );
  return ctx;
}

describe("NextCoverPrefetch", () => {
  beforeEach(() => {
    mockPrefetch.mockReset();
    mockPrefetch.mockResolvedValue(true);
  });

  it("prefetches the next track's cover at the player's size when a list starts", async () => {
    const ctx = await setup();
    await act(async () => {
      await ctx.playback.playList([track("1"), track("2"), track("3")], 0, album);
    });
    expect(mockPrefetch).toHaveBeenCalledTimes(1);
    expect(mockPrefetch).toHaveBeenCalledWith(tiers("2"), size());
  });

  it("prefetches the new next cover on every track change", async () => {
    const ctx = await setup();
    await act(async () => {
      await ctx.playback.playList([track("1"), track("2"), track("3")], 0, album);
    });
    await act(async () => {
      await ctx.playback.next();
    });
    expect(mockPrefetch).toHaveBeenCalledTimes(2);
    expect(mockPrefetch).toHaveBeenLastCalledWith(tiers("3"), size());
  });

  it("prefetches nothing at the last track", async () => {
    const ctx = await setup();
    await act(async () => {
      await ctx.playback.playList([track("1"), track("2")], 1, album);
    });
    expect(mockPrefetch).not.toHaveBeenCalled();
  });

  it("prefetches nothing for a next track without a cover", async () => {
    const ctx = await setup();
    await act(async () => {
      await ctx.playback.playList([track("1"), track("2", false)], 0, album);
    });
    expect(mockPrefetch).not.toHaveBeenCalled();
  });

  it("logs a failed prefetch", async () => {
    mockPrefetch.mockResolvedValue(false);
    const ctx = await setup();
    await act(async () => {
      await ctx.playback.playList([track("1"), track("2")], 0, album);
    });
    expect(ctx.log.warn).toHaveBeenCalledWith("image.prefetch_failed", { trackId: "2" });
  });

  it("logs a rejected prefetch with its message", async () => {
    mockPrefetch.mockRejectedValue(new Error("boom"));
    const ctx = await setup();
    await act(async () => {
      await ctx.playback.playList([track("1"), track("2")], 0, album);
    });
    expect(ctx.log.warn).toHaveBeenCalledWith("image.prefetch_failed", {
      trackId: "2",
      message: "Error: boom",
    });
  });
});

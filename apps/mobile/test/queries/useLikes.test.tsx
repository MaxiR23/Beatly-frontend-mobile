// apps/mobile/test/queries/useLikes.test.tsx
//
// Tests for the likes mirror hooks.
//
// Tested:
// - useIsLiked, useLikesActions
//
// What is covered:
// - the answer for one track, and a re-render with the new value when the mirror notifies
// - Not applicable: cache time, because the mirror is the cache (likes.md) and there is no query
//
// Run with: pnpm --filter @beatly/mobile test -- useLikes
//
// SEE: apps/mobile/src/queries/useLikes.ts

import { describe, expect, it } from "@jest/globals";
import { act, renderHook } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { useIsLiked, useLikesActions } from "../../src/queries/useLikes.ts";
import { makeCore, Wrapper } from "../helpers/core.tsx";

const track = {
  track_id: "t1",
  title: "Song",
  artists: [{ id: "ar1", name: "Artist" }],
  album: "Album",
  album_id: "al1",
  thumbnail_url: "test://img/t1",
  duration_seconds: 200,
};

describe("useIsLiked", () => {
  it("answers from the mirror for the track", async () => {
    const ctx = makeCore({ likedIds: ["t1"] });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <Wrapper core={ctx.core}>{children}</Wrapper>
    );
    const liked = await renderHook(() => useIsLiked("t1"), { wrapper });
    const other = await renderHook(() => useIsLiked("t2"), { wrapper });
    expect(liked.result.current).toBe(true);
    expect(other.result.current).toBe(false);
  });

  it("re-renders with the new value when the mirror notifies", async () => {
    const ctx = makeCore();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <Wrapper core={ctx.core}>{children}</Wrapper>
    );
    const { result } = await renderHook(
      () => ({ liked: useIsLiked("t1"), likes: useLikesActions() }),
      { wrapper },
    );
    expect(result.current.liked).toBe(false);
    await act(async () => {
      await result.current.likes.setLiked(track, true);
    });
    expect(result.current.liked).toBe(true);
    await act(async () => {
      await result.current.likes.setLiked(track, false);
    });
    expect(result.current.liked).toBe(false);
  });
});

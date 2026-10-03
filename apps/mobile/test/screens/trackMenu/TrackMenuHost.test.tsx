// apps/mobile/test/screens/trackMenu/TrackMenuHost.test.tsx
//
// Tests for the track menu host, button and sheet.
//
// Tested:
// - TrackMenuHost, TrackMenuButton and TrackMenuSheet, through the sheet fallback
//
// What is covered:
// - the sheet with only the items that apply, closing on a choice
// - like through the likes service with the mapped input, the error notice for a rejected like and for a storage failure, hiding after its time, nothing for a pending one
// - go to artist and go to album closing the sheet and calling the screen
// - remove calling the service for an own playlist, and the error notice when it fails
//
// Run with: pnpm --filter @beatly/mobile test -- TrackMenuHost
//
// SEE: apps/mobile/src/screens/trackMenu/TrackMenuHost.tsx

import { motion } from "@beatly/ui";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, screen } from "@testing-library/react-native";

import { resources } from "../../../src/i18n/resources.ts";
import { fullTrack, setupMenu } from "./trackMenuHelpers.tsx";

const en = resources.en;

afterEach(() => {
  jest.useRealTimers();
});

const openMenu = () => fireEvent.press(screen.getByRole("button", { name: en.trackMenu.more }));
const choose = (label: string) => fireEvent.press(screen.getByRole("button", { name: label }));

describe("the track menu", () => {
  it("opens the sheet with only the items that apply", async () => {
    await setupMenu({}, { track: { ...fullTrack, coverUrl: null } });
    await openMenu();
    expect(screen.getByTestId("track-menu-sheet")).toBeTruthy();
    expect(screen.getByText("Menu Song")).toBeTruthy();
    expect(screen.queryByRole("button", { name: en.trackMenu.items.like })).toBeNull();
    expect(screen.queryByRole("button", { name: en.trackMenu.items.addToPlaylist })).toBeNull();
    expect(screen.getByRole("button", { name: en.trackMenu.items.goToArtist })).toBeTruthy();
    expect(screen.getByRole("button", { name: en.trackMenu.items.goToAlbum })).toBeTruthy();
    expect(screen.getByRole("button", { name: en.trackMenu.items.credits })).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: en.trackMenu.items.removeFromPlaylist }),
    ).toBeNull();
  });

  it("offers every item, remove included, for a full track in an own playlist", async () => {
    await setupMenu({}, { ownPlaylistId: "p1" });
    await openMenu();
    for (const label of Object.values(en.trackMenu.items)) {
      if (label === en.trackMenu.items.unlike) continue;
      expect(screen.getByRole("button", { name: label })).toBeTruthy();
    }
  });

  it("likes through the likes service and closes the sheet", async () => {
    const ctx = await setupMenu();
    await openMenu();
    await choose(en.trackMenu.items.like);
    expect(ctx.likes.setLiked).toHaveBeenCalledWith(
      {
        track_id: "t1",
        title: "Menu Song",
        artists: [{ id: "ar1", name: "Ann" }],
        album: "Album",
        album_id: "al1",
        thumbnail_url: "test://img/t1",
        duration_seconds: 200,
      },
      true,
    );
    expect(screen.queryByTestId("track-menu-sheet")).toBeNull();
    await openMenu();
    expect(screen.getByRole("button", { name: en.trackMenu.items.unlike })).toBeTruthy();
  });

  it.each([
    ["rejected", { kind: "rejected", reason: "invalid_request" } as const],
    ["a storage failure", { kind: "storage_failure", cause: "write" } as const],
  ])("shows the error notice when the like is %s, then hides it", async (_name, outcome) => {
    jest.useFakeTimers({ advanceTimers: true });
    await setupMenu({ likeOutcome: () => Promise.resolve(outcome) });
    await openMenu();
    await choose(en.trackMenu.items.like);
    expect(await screen.findByText(en.common.error.generic)).toBeTruthy();
    await act(() => {
      jest.advanceTimersByTime(motion.duration.notice + 1);
    });
    expect(screen.queryByText(en.common.error.generic)).toBeNull();
  });

  it("shows nothing when the like is pending", async () => {
    await setupMenu({ likeOutcome: () => Promise.resolve({ kind: "pending" }) });
    await openMenu();
    await choose(en.trackMenu.items.like);
    expect(screen.queryByText(en.common.error.generic)).toBeNull();
  });

  it("goes to the first artist with an id and closes the sheet", async () => {
    const ctx = await setupMenu();
    await openMenu();
    await choose(en.trackMenu.items.goToArtist);
    expect(ctx.onOpenArtist).toHaveBeenCalledWith("ar1");
    expect(screen.queryByTestId("track-menu-sheet")).toBeNull();
  });

  it("goes to the album and closes the sheet", async () => {
    const ctx = await setupMenu();
    await openMenu();
    await choose(en.trackMenu.items.goToAlbum);
    expect(ctx.onOpenAlbum).toHaveBeenCalledWith("al1");
    expect(screen.queryByTestId("track-menu-sheet")).toBeNull();
  });

  it("removes from an own playlist", async () => {
    const ctx = await setupMenu({}, { ownPlaylistId: "p1" });
    await openMenu();
    await choose(en.trackMenu.items.removeFromPlaylist);
    expect(ctx.removeTrackFromPlaylist).toHaveBeenCalledWith("p1", "t1");
    expect(screen.queryByTestId("track-menu-sheet")).toBeNull();
    expect(screen.queryByText(en.common.error.generic)).toBeNull();
  });

  it("shows the error notice when the remove fails", async () => {
    await setupMenu(
      {
        removeTrackFromPlaylist: () =>
          Promise.resolve({ kind: "api_failure", reason: "playlist_not_found" }),
      },
      { ownPlaylistId: "p1" },
    );
    await openMenu();
    await choose(en.trackMenu.items.removeFromPlaylist);
    expect(await screen.findByText(en.common.error.generic)).toBeTruthy();
  });
});

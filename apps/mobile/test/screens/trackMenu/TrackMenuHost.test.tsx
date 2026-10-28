// apps/mobile/test/screens/trackMenu/TrackMenuHost.test.tsx
//
// Tests for the track menu host, button and sheet.
//
// Tested:
// - TrackMenuHost, TrackMenuButton and TrackMenuSheet, through the sheet fallback
//
// What is covered:
// - the sheet with only the items that apply, closing on a choice
// - the header: the regular cover on iOS; on Android the 48 cover full width with a divider under it
// - like through the likes service with the mapped input, the error notice for a rejected like and for a storage failure, hiding after its time, the error notice on Android at the bottom inset, hiding after its time, nothing for a pending one
// - a secondary artist without an id drawn by name in the sheet header, never linked
// - go to artist and go to album closing the sheet and calling the screen
// - remove calling the service for an own playlist, and the error notice when it fails
// - report a problem swapping the menu for the report form with the track's title, and sending the track attached
//
// Run with: pnpm --filter @beatly/mobile test -- TrackMenuHost
//
// SEE: apps/mobile/src/screens/trackMenu/TrackMenuHost.tsx

import { color, layout, motion, spacing } from "@beatly/ui";
import { border } from "@beatly/ui/native";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, screen, within } from "@testing-library/react-native";
import { Platform } from "react-native";

import { resources } from "../../../src/i18n/resources.ts";
import { fullTrack, setupMenu } from "./trackMenuHelpers.tsx";
import { flatStyle } from "../../helpers/flatStyle.ts";

const en = resources.en;

afterEach(() => {
  Platform.OS = "ios";
  jest.useRealTimers();
});

const openMenu = () => fireEvent.press(screen.getByRole("button", { name: en.trackMenu.more }));
const choose = (label: string) => fireEvent.press(screen.getByRole("button", { name: label }));

describe("the track menu", () => {
  it("draws the sheet's song row at the small tier", async () => {
    await setupMenu();
    await openMenu();
    const sheet = screen.getByTestId("track-menu-sheet");
    expect(within(sheet).getByTestId("cover-single").props.source).toEqual({
      uri: "test://img/t1/s",
    });
  });

  it("on iOS draws the header with the regular cover and no divider", async () => {
    await setupMenu();
    await openMenu();
    expect(screen.queryByTestId("track-menu-sheet-divider")).toBeNull();
    expect(screen.queryByTestId("track-menu-sheet-header")).toBeNull();
    expect(flatStyle(screen.getByTestId("cover-single").props.style)).toMatchObject({
      width: layout.rowCover,
      height: layout.rowCover,
    });
  });

  it("on Android draws the 48 header cover full width and a divider under it", async () => {
    Platform.OS = "android";
    await setupMenu();
    await openMenu();
    expect(flatStyle(screen.getByTestId("track-menu-sheet-header").props.style)).toEqual({
      marginHorizontal: -spacing.xl,
    });
    expect(
      within(screen.getByTestId("track-menu-sheet-header")).getByTestId("track-menu-sheet-divider"),
    ).toBeTruthy();
    expect(flatStyle(screen.getByTestId("track-menu-sheet-divider").props.style)).toEqual({
      borderBottomColor: color.surface.border,
      borderBottomWidth: border.hairline,
      marginBottom: spacing.xs,
    });
    expect(flatStyle(screen.getByTestId("cover-single").props.style)).toMatchObject({
      width: layout.rowCoverMenu,
      height: layout.rowCoverMenu,
    });
  });

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
        artists: [
          { id: "ar1", name: "Ann" },
          { id: null, name: "Guest" },
        ],
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

  it("shows the error notice as the snackbar on Android above the bottom inset, then hides it", async () => {
    Platform.OS = "android";
    jest.useFakeTimers({ advanceTimers: true });
    await setupMenu({
      likeOutcome: () => Promise.resolve({ kind: "rejected", reason: "invalid_request" }),
    });
    await openMenu();
    await choose(en.trackMenu.items.like);
    expect(await screen.findByText(en.common.error.generic)).toBeTruthy();
    const wrapper = within(screen.getByTestId("track-menu-notice"));
    const message = wrapper.getByText(en.common.error.generic);
    // The snackbar draws its message in the inverse tone; the inline row uses the primary one.
    expect(flatStyle(message.props.style)).toMatchObject({ color: color.text.inverse });
    expect(flatStyle(screen.getByTestId("track-menu-notice").props.style)).toMatchObject({
      position: "absolute",
      bottom: 0 + spacing.md,
    });
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

  it("goes to the first artist and closes the sheet", async () => {
    const ctx = await setupMenu();
    await openMenu();
    await choose(en.trackMenu.items.goToArtist);
    expect(ctx.onOpenArtist).toHaveBeenCalledWith("ar1");
    expect(screen.queryByTestId("track-menu-sheet")).toBeNull();
  });

  it("draws a secondary artist without an id by name, with no link", async () => {
    await setupMenu();
    await openMenu();
    expect(screen.getByText("Ann, Guest")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Guest" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Guest" })).toBeNull();
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

  it("opens the report form with the track's title from the menu", async () => {
    await setupMenu();
    await openMenu();
    await choose(en.trackMenu.items.report);
    expect(screen.queryByTestId("track-menu-sheet")).toBeNull();
    expect(screen.getByText("About: Menu Song")).toBeTruthy();
  });

  it("sends the report with the track attached", async () => {
    const ctx = await setupMenu();
    await openMenu();
    await choose(en.trackMenu.items.report);
    await choose(en.bugReports.categories.ui);
    await fireEvent.changeText(
      screen.getByLabelText(en.bugReports.form.description),
      "The cover is cut",
    );
    await fireEvent.press(screen.getByRole("button", { name: en.bugReports.form.send }));
    expect(ctx.createBugReport).toHaveBeenCalledWith({
      category: "ui",
      description: "The cover is cut",
      entity: { type: "track", id: "t1" },
    });
  });
});

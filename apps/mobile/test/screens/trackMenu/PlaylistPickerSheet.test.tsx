// apps/mobile/test/screens/trackMenu/PlaylistPickerSheet.test.tsx
//
// Tests for the playlist picker sheet.
//
// Tested:
// - PlaylistPickerSheet, opened from the track menu
//
// What is covered:
// - loading, the error with retry, the empty message under the new playlist row
// - the playlists that hold the track checked and ignoring a press on them
// - adding to another playlist: the confirmation, then the sheet closes; track_already_in_playlist counted as added
// - the generic error inline with the sheet open when the add fails
// - creating a new playlist with the track: create disabled until a valid name, the trimmed title sent
//
// Run with: pnpm --filter @beatly/mobile test -- PlaylistPickerSheet
//
// SEE: apps/mobile/src/screens/trackMenu/PlaylistPickerSheet.tsx

import type { PlaylistListItem } from "@beatly/core";
import { motion } from "@beatly/ui";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, screen } from "@testing-library/react-native";

import { resources } from "../../../src/i18n/resources.ts";
import { pageOf, playlistFixture, stateFlag } from "../../helpers/core.tsx";
import { setupMenu } from "./trackMenuHelpers.tsx";

const en = resources.en;
const second: PlaylistListItem = { ...playlistFixture, id: "p2", title: "Gym" };

afterEach(() => {
  jest.useRealTimers();
});

async function openPicker(options: Parameters<typeof setupMenu>[0] = {}) {
  const ctx = await setupMenu(options);
  await fireEvent.press(screen.getByRole("button", { name: en.trackMenu.more }));
  await fireEvent.press(screen.getByRole("button", { name: en.trackMenu.items.addToPlaylist }));
  return ctx;
}

const lists = {
  listPlaylists: () => Promise.resolve(pageOf([playlistFixture, second])),
};

describe("the playlist picker", () => {
  it("draws loading while the playlists load", async () => {
    await openPicker({ listPlaylists: () => new Promise<never>(() => undefined) });
    expect(screen.getByRole("progressbar", { name: en.common.loading })).toBeTruthy();
    expect(screen.getByText(en.trackMenu.picker.title)).toBeTruthy();
  });

  it("draws the error with retry", async () => {
    const ctx = await openPicker({
      listPlaylists: () => Promise.resolve({ kind: "transport_failure", cause: "network" }),
    });
    expect(await screen.findByText(en.common.error.generic)).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: en.common.retry }));
    expect(ctx.listPlaylists).toHaveBeenCalledTimes(2);
  });

  it("draws the empty message under the new playlist row", async () => {
    await openPicker({ listPlaylists: () => Promise.resolve(pageOf<PlaylistListItem>([])) });
    expect(await screen.findByText(en.trackMenu.picker.empty)).toBeTruthy();
    expect(screen.getByRole("button", { name: en.trackMenu.picker.newPlaylist })).toBeTruthy();
  });

  it("checks the playlists that hold the track and ignores a tap on them", async () => {
    const ctx = await openPicker({
      ...lists,
      listPlaylistsWithTrack: () =>
        Promise.resolve({ kind: "success", maxAgeSeconds: 0, data: { playlist_ids: ["p1"] } }),
    });
    expect(await screen.findByText("Gym")).toBeTruthy();
    expect(screen.getByLabelText(en.trackMenu.picker.inPlaylist)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Road trip" })).toBeNull();
    expect(screen.getByTestId("picker-held-p1")).toBeTruthy();
    expect(ctx.addTrackToPlaylist).not.toHaveBeenCalled();
  });

  it("adds to another playlist, shows the confirmation, then closes", async () => {
    jest.useFakeTimers({ advanceTimers: true });
    const ctx = await openPicker(lists);
    await fireEvent.press(await screen.findByRole("button", { name: "Gym" }));
    expect(ctx.addTrackToPlaylist).toHaveBeenCalledWith(
      "p2",
      expect.objectContaining({ track_id: "t1", duration_seconds: 200 }),
    );
    expect(await screen.findByText("Added to Gym")).toBeTruthy();
    await act(() => {
      jest.advanceTimersByTime(motion.duration.notice + 1);
    });
    expect(screen.queryByTestId("playlist-picker")).toBeNull();
    expect(screen.queryByText("Added to Gym")).toBeNull();
  });

  it("counts track_already_in_playlist as added", async () => {
    await openPicker({
      ...lists,
      addTrackToPlaylist: () =>
        Promise.resolve({ kind: "success", maxAgeSeconds: 0, data: { alreadyThere: true } }),
    });
    await fireEvent.press(await screen.findByRole("button", { name: "Gym" }));
    expect(await screen.findByText("Added to Gym")).toBeTruthy();
  });

  it("shows the generic error and stays open when the add fails", async () => {
    await openPicker({
      ...lists,
      addTrackToPlaylist: () => Promise.resolve({ kind: "api_failure", reason: "upstream_error" }),
    });
    await fireEvent.press(await screen.findByRole("button", { name: "Gym" }));
    expect(await screen.findByText(en.common.error.generic)).toBeTruthy();
    expect(screen.getByTestId("playlist-picker")).toBeTruthy();
    expect(screen.queryByText("Added to Gym")).toBeNull();
  });

  it("creates a new playlist with the track", async () => {
    const ctx = await openPicker(lists);
    await fireEvent.press(
      await screen.findByRole("button", { name: en.trackMenu.picker.newPlaylist }),
    );
    const create = screen.getByRole("button", { name: en.trackMenu.picker.create });
    expect(stateFlag(create, "disabled")).toBe(true);
    await fireEvent.changeText(screen.getByLabelText(en.trackMenu.picker.name), "  Night drive  ");
    await fireEvent.press(screen.getByRole("button", { name: en.trackMenu.picker.create }));
    expect(ctx.createPlaylistWithTrack).toHaveBeenCalledWith(
      "Night drive",
      expect.objectContaining({ track_id: "t1" }),
    );
    expect(await screen.findByText("Added to New one")).toBeTruthy();
  });
});

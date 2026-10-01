// apps/mobile/test/app/(tabs)/_layout.test.tsx
//
// Tests for the tab navigator.
//
// Tested:
// - the tabs layout on the floating bar branch
//
// What is covered:
// - four icon-only tabs with accessible labels, home selected on "/", explore, search and library from their tabs
// - no mini player while idle, the mini player above the tabs once a track is loaded and opening the player from it
//
// Run with: pnpm --filter @beatly/mobile test -- _layout
//
// SEE: apps/mobile/app/(tabs)/_layout.tsx

import { describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, renderRouter, screen } from "expo-router/testing-library";

import { resources } from "../../../src/i18n/resources.ts";
import { installCore } from "../../helpers/routeCore.ts";

jest.mock("../../../src/createCore.ts", () => ({ createCore: () => mockCore.current }));
const mockCore = installCore();

const en = resources.en;

function isSelected(node: { props: unknown }): unknown {
  const props = node.props as { accessibilityState?: { selected?: unknown } };
  return props.accessibilityState?.selected;
}

describe("the tabs layout", () => {
  it("draws four tabs with their accessible labels", async () => {
    mockCore.set("signed_in");
    await renderRouter("app", { initialUrl: "/" });
    await screen.findByTestId("home");
    for (const label of [en.tabs.home, en.tabs.explore, en.tabs.search, en.tabs.library]) {
      expect(screen.getByRole("tab", { name: label })).toBeTruthy();
      expect(screen.queryByText(label)).toBeNull();
    }
  });

  it("selects home on /", async () => {
    mockCore.set("signed_in");
    await renderRouter("app", { initialUrl: "/" });
    await screen.findByTestId("home");
    expect(isSelected(screen.getByRole("tab", { name: en.tabs.home }))).toBe(true);
    expect(isSelected(screen.getByRole("tab", { name: en.tabs.explore }))).toBe(false);
  });

  it("opens explore from its tab", async () => {
    mockCore.set("signed_in");
    await renderRouter("app", { initialUrl: "/" });
    await screen.findByTestId("home");
    await fireEvent.press(screen.getByRole("tab", { name: en.tabs.explore }));
    expect(await screen.findByTestId("explore")).toBeTruthy();
    expect(screen.getByText(en.explore.title)).toBeTruthy();
    expect(isSelected(screen.getByRole("tab", { name: en.tabs.explore }))).toBe(true);
  });

  it("opens search from its tab", async () => {
    mockCore.set("signed_in");
    await renderRouter("app", { initialUrl: "/" });
    await screen.findByTestId("home");
    await fireEvent.press(screen.getByRole("tab", { name: en.tabs.search }));
    expect(await screen.findByTestId("search")).toBeTruthy();
    expect(await screen.findByText(en.search.recent.empty)).toBeTruthy();
    expect(isSelected(screen.getByRole("tab", { name: en.tabs.search }))).toBe(true);
  });

  it("opens library from its tab", async () => {
    mockCore.set("signed_in");
    await renderRouter("app", { initialUrl: "/" });
    await screen.findByTestId("home");
    await fireEvent.press(screen.getByRole("tab", { name: en.tabs.library }));
    expect(await screen.findByTestId("library")).toBeTruthy();
    expect(await screen.findByText(en.library.liked)).toBeTruthy();
    expect(isSelected(screen.getByRole("tab", { name: en.tabs.library }))).toBe(true);
  });

  it("draws no mini player while nothing is loaded", async () => {
    mockCore.set("signed_in");
    await renderRouter("app", { initialUrl: "/" });
    await screen.findByTestId("home");
    expect(screen.queryByTestId("mini-player")).toBeNull();
  });

  it("draws the mini player above the tabs once a track is loaded and opens the player from it", async () => {
    mockCore.set("signed_in");
    await renderRouter("app", { initialUrl: "/" });
    await screen.findByTestId("home");
    await act(async () => {
      await mockCore.current.playback.playList(
        [
          {
            trackId: "t1",
            title: "Song",
            artists: [{ id: "ar1", name: "Ann" }],
            album: "Album",
            albumId: "a1",
            coverUrl: null,
            durationSeconds: 100,
          },
        ],
        0,
        { kind: "album", id: "a1", name: "Album" },
      );
    });
    expect(await screen.findByTestId("mini-player")).toBeTruthy();
    expect(screen.getByText("Song")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: en.player.open }));
    expect(await screen.findByTestId("player")).toBeTruthy();
  });
});

// apps/mobile/test/app/(tabs)/_layout.test.tsx
//
// Tests for the tab navigator.
//
// Tested:
// - the tabs layout on the floating bar branch, on iOS below 26 and on Android
//
// What is covered:
// - four icon-only tabs with accessible labels, home selected on "/", explore, search and library from their tabs
// - no mini player while idle, the mini player above the tabs once a track is loaded and opening the player from it
// - the status strip while offline: above the mini player, or above the pill or the tab row when nothing is loaded, gone when the connection returns; inside the Android block
// - on Android: the docked bar instead of the pill with the four names visible and home selected, and the mini player inside it once a track is loaded
//
// Run with: pnpm --filter @beatly/mobile test -- _layout
//
// SEE: apps/mobile/app/(tabs)/_layout.tsx

import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { onlineManager } from "@tanstack/react-query";
import { act, fireEvent, renderRouter, screen, within } from "expo-router/testing-library";
import { Platform } from "react-native";

import { resources } from "../../../src/i18n/resources.ts";
import { installCore } from "../../helpers/routeCore.ts";

jest.mock("../../../src/createCore.ts", () => ({ createCore: () => mockCore.current }));
const mockCore = installCore();

const en = resources.en;

function isSelected(node: { props: unknown }): unknown {
  const props = node.props as { accessibilityState?: { selected?: unknown } };
  return props.accessibilityState?.selected;
}

afterEach(() => {
  Platform.OS = "ios";
  onlineManager.setOnline(true);
});

const loadTrack = () =>
  act(async () => {
    await mockCore.current.playback.playList(
      [
        {
          trackId: "t1",
          title: "Song",
          artists: [{ id: "ar1", name: "Ann" }],
          album: "Album",
          albumId: "a1",
          coverUrl: null,
          image: null,
          durationSeconds: 100,
        },
      ],
      0,
      { kind: "album", id: "a1", name: "Album" },
    );
  });

const goOffline = () =>
  act(() => {
    onlineManager.setOnline(false);
  });

// The testIDs of a rendered tree in document order.
function order(ids: string[]): string[] {
  const found: string[] = [];
  const visit = (node: unknown) => {
    if (Array.isArray(node)) node.forEach(visit);
    if (typeof node !== "object" || node === null) return;
    const { props, children } = node as { props?: { testID?: unknown }; children?: unknown };
    if (typeof props?.testID === "string" && ids.includes(props.testID)) found.push(props.testID);
    visit(children);
  };
  visit(screen.toJSON());
  return found;
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
            image: null,
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

describe("the status strip", () => {
  it("draws the offline line above the mini player and removes it when back online", async () => {
    mockCore.set("signed_in");
    await renderRouter("app", { initialUrl: "/" });
    await screen.findByTestId("home");
    await loadTrack();
    await goOffline();
    expect(
      within(screen.getByTestId("tab-status")).getByText(en.common.connection.offline),
    ).toBeTruthy();
    expect(order(["tab-status", "tab-accessory", "tab-pill"])).toEqual([
      "tab-status",
      "tab-accessory",
      "tab-pill",
    ]);
    await act(() => {
      onlineManager.setOnline(true);
    });
    expect(screen.queryByTestId("tab-status")).toBeNull();
  });

  it("draws the offline line above the pill when nothing is loaded", async () => {
    mockCore.set("signed_in");
    await renderRouter("app", { initialUrl: "/" });
    await screen.findByTestId("home");
    await goOffline();
    expect(screen.getByText(en.common.connection.offline)).toBeTruthy();
    expect(order(["tab-status", "tab-pill"])).toEqual(["tab-status", "tab-pill"]);
  });
});

describe("the tabs layout on Android", () => {
  it("draws the offline line inside the docked bar above the mini player", async () => {
    Platform.OS = "android";
    mockCore.set("signed_in");
    await renderRouter("app", { initialUrl: "/" });
    await screen.findByTestId("home");
    await loadTrack();
    await goOffline();
    expect(within(screen.getByTestId("tab-dock")).getByTestId("tab-status")).toBeTruthy();
    expect(order(["tab-status", "tab-accessory", "tab-row"])).toEqual([
      "tab-status",
      "tab-accessory",
      "tab-row",
    ]);
  });

  it("draws the offline line above the tab row when nothing is loaded", async () => {
    Platform.OS = "android";
    mockCore.set("signed_in");
    await renderRouter("app", { initialUrl: "/" });
    await screen.findByTestId("home");
    await goOffline();
    expect(order(["tab-status", "tab-row"])).toEqual(["tab-status", "tab-row"]);
  });

  it("draws the docked bar with the four names visible", async () => {
    Platform.OS = "android";
    mockCore.set("signed_in");
    await renderRouter("app", { initialUrl: "/" });
    await screen.findByTestId("home");
    expect(screen.getByTestId("tab-dock")).toBeTruthy();
    expect(screen.queryByTestId("tab-pill")).toBeNull();
    for (const label of [en.tabs.home, en.tabs.explore, en.tabs.search, en.tabs.library]) {
      expect(screen.getByRole("tab", { name: label })).toBeTruthy();
      expect(screen.getByText(label)).toBeTruthy();
    }
    expect(isSelected(screen.getByRole("tab", { name: en.tabs.home }))).toBe(true);
  });

  it("draws the mini player inside the docked bar once a track is loaded", async () => {
    Platform.OS = "android";
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
            image: null,
            durationSeconds: 100,
          },
        ],
        0,
        { kind: "album", id: "a1", name: "Album" },
      );
    });
    expect(await screen.findByTestId("mini-player")).toBeTruthy();
    expect(within(screen.getByTestId("tab-accessory")).getByTestId("mini-player")).toBeTruthy();
  });
});

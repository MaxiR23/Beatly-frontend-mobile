// apps/mobile/test/screens/home/HomeScreen.test.tsx
//
// Tests for the home tab.
//
// Tested:
// - HomeScreen
//
// What is covered:
// - loading, both sections, a hidden empty section, the empty state, the generic error with retry
// - own playlists named after the profile, and the line of each recent by type (en and es)
// - the next page of playlists at the end of the carousel
// - an album recent opens the album, an artist or playlist recent does not
// - the avatar initials, the account sheet and logout in every state, en and es
//
// Run with: pnpm --filter @beatly/mobile test -- HomeScreen
//
// SEE: apps/mobile/src/screens/home/HomeScreen.tsx

import type { HttpOutcome, PageResult, PlaylistListItem, RecentEntity } from "@beatly/core";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { i18n } from "../../../src/adapters/i18n.ts";
import { resources } from "../../../src/i18n/resources.ts";
import { HomeScreen } from "../../../src/screens/home/HomeScreen.tsx";
import {
  makeCore,
  pageOf,
  playlistFixture,
  profileFixture,
  recentFixture,
  successOf,
  Wrapper,
} from "../../helpers/core.tsx";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));

afterEach(async () => {
  mockPush.mockClear();
  await i18n.changeLanguage("en");
});

const en = resources.en;

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function Screen() {
  return (
    <SafeAreaProvider initialMetrics={metrics}>
      <HomeScreen />
    </SafeAreaProvider>
  );
}

type Options = Parameters<typeof makeCore>[0];

async function setup(options: Options = {}) {
  const ctx = makeCore(options);
  await render(
    <Wrapper core={ctx.core}>
      <Screen />
    </Wrapper>,
  );
  return ctx;
}

function recents(items: RecentEntity[]) {
  return () => Promise.resolve(pageOf(items));
}

function playlistsOf(items: PlaylistListItem[]) {
  return () => Promise.resolve(pageOf(items));
}

const failure: HttpOutcome<PageResult<never>> = { kind: "api_failure", reason: "upstream_error" };

describe("HomeScreen", () => {
  it("draws the loading state while either list loads", async () => {
    await setup({
      listRecents: recents([recentFixture]),
      listPlaylists: () => new Promise(() => undefined),
    });
    expect(screen.getByLabelText(en.common.loading)).toBeTruthy();
  });

  it("draws both sections when both have items", async () => {
    await setup({
      listRecents: recents([recentFixture]),
      listPlaylists: playlistsOf([playlistFixture]),
    });
    expect(await screen.findByText(en.home.recents)).toBeTruthy();
    expect(screen.getByText(en.home.playlists)).toBeTruthy();
    expect(screen.getByText("Recent album")).toBeTruthy();
    expect(screen.getByText("Road trip")).toBeTruthy();
    expect(await screen.findByText("maxi_23")).toBeTruthy();
    expect(screen.queryByText("Windows down")).toBeNull();
  });

  it("draws the display name under own playlists when there is no username", async () => {
    await setup({
      listPlaylists: playlistsOf([playlistFixture]),
      getMyProfile: () =>
        Promise.resolve(successOf({ ...profileFixture, username: null, display_name: "Maxi" })),
    });
    await screen.findByText("Road trip");
    expect(await within(screen.getByTestId("playlists")).findByText("Maxi")).toBeTruthy();
  });

  it("draws no subtitle under own playlists when the profile fails", async () => {
    await setup({
      listPlaylists: playlistsOf([playlistFixture]),
      getMyProfile: () => Promise.resolve({ kind: "api_failure", reason: "profile_not_found" }),
    });
    expect(await screen.findByText("Road trip")).toBeTruthy();
    expect(screen.queryByText("maxi_23")).toBeNull();
    expect(screen.queryByText("Windows down")).toBeNull();
  });

  it("draws the line of each recent by type", async () => {
    const meta = { subtitle: null, thumbnail_url: null };
    await setup({
      listRecents: recents([
        {
          ...recentFixture,
          entity_type: "artist",
          entity_id: "ar1",
          metadata: { title: "An artist", ...meta },
        },
        recentFixture,
        {
          ...recentFixture,
          entity_type: "playlist",
          entity_id: "pl1",
          metadata: { title: "A playlist", subtitle: "Someone", thumbnail_url: null },
        },
        { ...recentFixture, entity_id: "a2", metadata: { title: "Bare album", ...meta } },
      ]),
    });
    const row = within(await screen.findByTestId("recents"));
    expect(row.getByText("Artist")).toBeTruthy();
    expect(row.getByText("Album · Some artist")).toBeTruthy();
    expect(row.getByText("Playlist · Someone")).toBeTruthy();
    expect(row.getAllByText("Album")).toHaveLength(1);
  });

  it("hides recently played when it is empty", async () => {
    await setup({ listPlaylists: playlistsOf([playlistFixture]) });
    expect(await screen.findByText(en.home.playlists)).toBeTruthy();
    expect(screen.queryByText(en.home.recents)).toBeNull();
  });

  it("hides your playlists when it is empty", async () => {
    await setup({ listRecents: recents([recentFixture]) });
    expect(await screen.findByText(en.home.recents)).toBeTruthy();
    expect(screen.queryByText(en.home.playlists)).toBeNull();
  });

  it("draws the empty state with no button when both are empty", async () => {
    await setup();
    expect(await screen.findByText(en.home.empty)).toBeTruthy();
    expect(screen.queryByText(en.common.retry)).toBeNull();
    expect(screen.queryByText(en.home.recents)).toBeNull();
    expect(screen.queryByText(en.home.playlists)).toBeNull();
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("draws the generic error when recents fail and retry refetches only them", async () => {
    const ctx = await setup({ listRecents: () => Promise.resolve(failure) });
    expect(await screen.findByText(en.common.error.generic)).toBeTruthy();
    await fireEvent.press(screen.getByText(en.common.retry));
    await waitFor(() => {
      expect(ctx.listRecents).toHaveBeenCalledTimes(2);
    });
    expect(ctx.listPlaylists).toHaveBeenCalledTimes(1);
  });

  it("loads the next page of playlists at the end of the carousel", async () => {
    const second = { ...playlistFixture, id: "p2", title: "Second page" };
    const ctx = await setup({
      listRecents: recents([recentFixture]),
      listPlaylists: (cursor) =>
        Promise.resolve(
          cursor === null
            ? pageOf([playlistFixture], { has_more: true, next_cursor: "c1" })
            : pageOf([second]),
        ),
    });
    await screen.findByText("Road trip");
    await fireEvent(screen.getByTestId("playlists"), "onEndReached");
    expect(await screen.findByText("Second page")).toBeTruthy();
    expect(ctx.listPlaylists).toHaveBeenLastCalledWith("c1");
  });

  it("draws the initials of the profile name in the avatar", async () => {
    await setup({
      getMyProfile: () =>
        Promise.resolve(successOf({ ...profileFixture, username: null, display_name: "Max Reb" })),
    });
    expect(await screen.findByText("MR")).toBeTruthy();
  });

  it("opens the account sheet from the avatar and logs out", async () => {
    const ctx = await setup();
    await screen.findByText(en.home.empty);
    await fireEvent.press(screen.getByRole("button", { name: en.common.account.open }));
    await fireEvent.press(await screen.findByRole("button", { name: en.common.account.logout }));
    await waitFor(() => {
      expect(ctx.auth.signOut).toHaveBeenCalledTimes(1);
    });
  });

  it("draws the generic error in the sheet when logout fails", async () => {
    const ctx = makeCore();
    ctx.auth.signOut.mockImplementation(() =>
      Promise.resolve({ kind: "failure", reason: "unknown" }),
    );
    await render(
      <Wrapper core={ctx.core}>
        <Screen />
      </Wrapper>,
    );
    await fireEvent.press(screen.getByRole("button", { name: en.common.account.open }));
    await fireEvent.press(await screen.findByRole("button", { name: en.common.account.logout }));
    expect(await screen.findAllByText(en.common.error.generic)).not.toHaveLength(0);
  });

  it("keeps the avatar and logout reachable when the profile fails", async () => {
    const ctx = await setup({
      getMyProfile: () => Promise.resolve({ kind: "api_failure", reason: "profile_not_found" }),
    });
    await screen.findByText(en.home.empty);
    expect(screen.queryByText("M")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: en.common.account.open }));
    await fireEvent.press(await screen.findByRole("button", { name: en.common.account.logout }));
    await waitFor(() => {
      expect(ctx.auth.signOut).toHaveBeenCalledTimes(1);
    });
  });

  it("keeps logout reachable in the error state", async () => {
    const ctx = await setup({ listPlaylists: () => Promise.resolve(failure) });
    await screen.findByText(en.common.retry);
    await fireEvent.press(screen.getByRole("button", { name: en.common.account.open }));
    await fireEvent.press(await screen.findByRole("button", { name: en.common.account.logout }));
    await waitFor(() => {
      expect(ctx.auth.signOut).toHaveBeenCalledTimes(1);
    });
  });

  it("draws in es", async () => {
    await i18n.changeLanguage("es");
    await setup({
      listRecents: recents([recentFixture]),
      listPlaylists: playlistsOf([playlistFixture]),
    });
    expect(await screen.findByText(resources.es.home.recents)).toBeTruthy();
    expect(screen.getByText(resources.es.home.playlists)).toBeTruthy();
    expect(screen.getByText("Álbum · Some artist")).toBeTruthy();
  });

  it("opens an album recent", async () => {
    await setup({ listRecents: recents([recentFixture]) });
    await fireEvent.press(await screen.findByRole("button", { name: "Recent album" }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: "/album/[id]", params: { id: "a1" } });
  });

  it("does not open an artist or playlist recent", async () => {
    const meta = { subtitle: null, thumbnail_url: null };
    await setup({
      listRecents: recents([
        {
          ...recentFixture,
          entity_type: "artist",
          entity_id: "ar1",
          metadata: { title: "An artist", ...meta },
        },
        {
          ...recentFixture,
          entity_type: "playlist",
          entity_id: "pl1",
          metadata: { title: "A playlist", ...meta },
        },
      ]),
    });
    await screen.findByText("An artist");
    expect(screen.getByText("A playlist")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "An artist" })).toBeNull();
    expect(screen.queryByRole("button", { name: "A playlist" })).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
  });
});

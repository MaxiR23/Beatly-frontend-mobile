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
// - an album recent opens the album, a playlist recent opens with its kind, an artist recent opens the artist, a kind-less playlist recent does not, a card of your playlists opens the playlist
// - the recommendation sections: their order, hidden empty lists, album artist and artist kind subtitles (no reason on cards), seed sections, navigation, skeletons while loading, and the inline error with retry that keeps recents and playlists (en and es)
// - the avatar initials, the account sheet and logout in every state, en and es
//
// Run with: pnpm --filter @beatly/mobile test -- HomeScreen
//
// SEE: apps/mobile/src/screens/home/HomeScreen.tsx

import type {
  HttpOutcome,
  PageResult,
  PlaylistListItem,
  RecentEntity,
  Recommendations,
} from "@beatly/core";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { radius } from "@beatly/ui";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react-native";

import { i18n } from "../../../src/adapters/i18n.ts";
import { resources } from "../../../src/i18n/resources.ts";
import { HomeScreen } from "../../../src/screens/home/HomeScreen.tsx";
import {
  makeCore,
  pageOf,
  playlistFixture,
  profileFixture,
  recentFixture,
  recommendationsFixture,
  successOf,
  Wrapper,
} from "../../helpers/core.tsx";
import { flatStyle } from "../../helpers/flatStyle.ts";
import { Insets } from "../../helpers/insets.tsx";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));

afterEach(async () => {
  mockPush.mockClear();
  await i18n.changeLanguage("en");
});

const en = resources.en;

function Screen() {
  return (
    <Insets>
      <HomeScreen />
    </Insets>
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

const recommendationsOutcome = (data: Recommendations): HttpOutcome<Recommendations> => ({
  kind: "success",
  data,
  maxAgeSeconds: 0,
});

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

  it("draws the empty state with no button when recents, playlists and recommendations are empty", async () => {
    const ctx = await setup();
    expect(await screen.findByText(en.home.empty)).toBeTruthy();
    expect(screen.queryByText(en.common.retry)).toBeNull();
    expect(screen.queryByText(en.home.recents)).toBeNull();
    expect(screen.queryByText(en.home.playlists)).toBeNull();
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(ctx.generateRecommendations).toHaveBeenCalledTimes(1);
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

  it("opens an own playlist from your playlists", async () => {
    await setup({ listPlaylists: playlistsOf([playlistFixture]) });
    await fireEvent.press(await screen.findByRole("button", { name: "Road trip" }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/playlist/[id]",
      params: { id: "p1", source: "user" },
    });
  });

  it("opens an album recent", async () => {
    await setup({ listRecents: recents([recentFixture]) });
    await fireEvent.press(await screen.findByRole("button", { name: "Recent album" }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: "/album/[id]", params: { id: "a1" } });
  });

  it("opens an artist recent", async () => {
    const meta = { subtitle: null, thumbnail_url: null };
    await setup({
      listRecents: recents([
        {
          ...recentFixture,
          entity_type: "artist",
          entity_id: "ar1",
          metadata: { title: "An artist", ...meta },
        },
      ]),
    });
    await fireEvent.press(await screen.findByRole("button", { name: "An artist" }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: "/artist/[id]", params: { id: "ar1" } });
  });

  it("does not open a playlist recent without a kind", async () => {
    const meta = { subtitle: null, thumbnail_url: null };
    await setup({
      listRecents: recents([
        {
          ...recentFixture,
          entity_type: "playlist",
          entity_id: "pl1",
          metadata: { title: "A playlist", ...meta },
        },
      ]),
    });
    expect(await screen.findByText("A playlist")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "A playlist" })).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("opens a playlist recent with its kind: user, genre and liked", async () => {
    const meta = { subtitle: null, thumbnail_url: null };
    const playlistRecent = (id: string, title: string, kind: "user" | "genre" | "liked") => ({
      ...recentFixture,
      entity_type: "playlist" as const,
      entity_id: id,
      metadata: { title, kind, ...meta },
    });
    await setup({
      listRecents: recents([
        playlistRecent("pl1", "Own one", "user"),
        playlistRecent("gp1", "Genre one", "genre"),
        playlistRecent("liked", "Liked one", "liked"),
      ]),
    });
    for (const [title, id, source] of [
      ["Own one", "pl1", "user"],
      ["Genre one", "gp1", "genre"],
      [en.playlist.liked, "liked", "liked"],
    ] as const) {
      await fireEvent.press(await screen.findByRole("button", { name: title }));
      expect(mockPush).toHaveBeenLastCalledWith({
        pathname: "/playlist/[id]",
        params: { id, source },
      });
    }
    expect(mockPush).toHaveBeenCalledTimes(3);
  });

  it("draws a liked recent title from i18n and a user playlist recent with its stored title", async () => {
    const meta = { subtitle: null, thumbnail_url: null };
    await setup({
      listRecents: recents([
        {
          ...recentFixture,
          entity_type: "playlist",
          entity_id: "liked",
          metadata: { title: "Tus me gusta guardado", kind: "liked", ...meta },
        },
        {
          ...recentFixture,
          entity_type: "playlist",
          entity_id: "pl1",
          metadata: { title: "Own one", kind: "user", ...meta },
        },
      ]),
    });
    const row = within(await screen.findByTestId("recents"));
    expect(row.getByText(en.playlist.liked)).toBeTruthy();
    expect(row.queryByText("Tus me gusta guardado")).toBeNull();
    expect(row.getByText("Own one")).toBeTruthy();
  });

  describe("recommendations", () => {
    const full = {
      listRecents: recents([recentFixture]),
      listPlaylists: playlistsOf([playlistFixture]),
      generateRecommendations: () =>
        Promise.resolve(recommendationsOutcome(recommendationsFixture)),
    };
    const ids = [
      "recents",
      "rec-albums-for-you",
      "rec-seed-0",
      "rec-recommended-albums",
      "rec-seed-1",
      "playlists",
      "rec-seed-2",
      "rec-recommended-artists",
    ];
    const names = (list: ReturnType<typeof within>) =>
      list.getAllByRole("button").map((node): unknown => node.props.accessibilityLabel);
    // The corner radius of the cover rendered inside a card or a lead.
    const coverRadius = (node: ReturnType<ReturnType<typeof within>["getByTestId"]>) =>
      flatStyle(node.parent?.props.style).borderRadius;

    it("draws the sections in order: recents, albums for you, seed 1, recommended albums, seed 2, your playlists, seed 3, recommended artists", async () => {
      await setup(full);
      await screen.findByTestId("rec-recommended-artists");
      const order = screen
        .getAllByTestId(
          /^(recents|playlists|rec-(albums-for-you|seed-\d|recommended-albums|recommended-artists))$/,
        )
        .map((node): unknown => node.props.testID);
      expect(order).toEqual(ids);
    });

    it("hides an empty recommendation list and a seed section that did not come", async () => {
      const data: Recommendations = {
        ...recommendationsFixture,
        albums_for_you: [],
        recommended_artists: [],
        seed_sections: recommendationsFixture.seed_sections.slice(0, 1),
      };
      await setup({
        ...full,
        generateRecommendations: () => Promise.resolve(recommendationsOutcome(data)),
      });
      await screen.findByTestId("rec-seed-0");
      for (const id of [
        "rec-albums-for-you",
        "rec-recommended-artists",
        "rec-seed-1",
        "rec-seed-2",
      ]) {
        expect(screen.queryByTestId(id)).toBeNull();
      }
      expect(screen.queryByText(en.home.albumsForYou)).toBeNull();
      expect(screen.queryByText(en.home.recommendedArtists)).toBeNull();
    });

    it("draws an album's cover, title and its artist, with no reason", async () => {
      await setup(full);
      const list = within(await screen.findByTestId("rec-albums-for-you"));
      expect(list.getByText("For You Artist-Seeded")).toBeTruthy();
      expect(list.getByText("By For You Artist-Seeded")).toBeTruthy();
      expect(list.getByText("For You Album-Seeded")).toBeTruthy();
      expect(list.getByText("By For You Album-Seeded")).toBeTruthy();
      expect(list.queryByText(/Because you|Similar to/)).toBeNull();
      const covers = list.getAllByTestId("cover-single");
      expect(covers).toHaveLength(2);
      for (const cover of covers) {
        expect(coverRadius(cover)).not.toBe(radius.full);
      }
    });

    it("draws the seed prefixes in es and no reason on any card", async () => {
      await i18n.changeLanguage("es");
      await setup(full);
      const list = within(await screen.findByTestId("rec-albums-for-you"));
      expect(list.getByText("By For You Artist-Seeded")).toBeTruthy();
      expect(list.queryByText(/Porque|Similar a/)).toBeNull();
      expect(screen.getByText("Más como")).toBeTruthy();
      expect(screen.getByText("Porque te gusta", { exact: true })).toBeTruthy();
      expect(screen.getByText("Si te gusta")).toBeTruthy();
      const seed = within(screen.getByTestId("rec-seed-0"));
      expect(seed.getAllByText("Artista")).toHaveLength(1);
      expect(seed.getByText("By Item Album Seed One")).toBeTruthy();
      expect(seed.queryByText("Álbum")).toBeNull();
    });

    it("draws a recommended artist's round photo, name and kind, centered, with no reason", async () => {
      await setup(full);
      const list = within(await screen.findByTestId("rec-recommended-artists"));
      for (const text of ["Rec Artist", en.home.kind.artist]) {
        expect(flatStyle(list.getByText(text).props.style).textAlign).toBe("center");
      }
      expect(list.queryByText(/Similar to/)).toBeNull();
      expect(coverRadius(list.getByTestId("cover-single"))).toBe(radius.full);
    });

    it("draws each seed section's photo, prefix by position and name, then its items in order with their type", async () => {
      await setup(full);
      await screen.findByTestId("rec-seed-0");
      const expected = [
        ["rec-seed-0", "More like", "Seed One"],
        ["rec-seed-1", "Because you like", "Seed Two"],
        ["rec-seed-2", "If you like", "Seed Three"],
      ] as const;
      for (const [id, prefix, name] of expected) {
        const lead = within(screen.getByTestId(`${id}-lead`));
        expect(lead.getByText(prefix)).toBeTruthy();
        expect(lead.getByText(name)).toBeTruthy();
        expect(lead.getByTestId("cover-single")).toBeTruthy();
      }
      const seed = within(screen.getByTestId("rec-seed-0"));
      expect(names(seed)).toEqual(["Item Artist Seed One", "Item Album Seed One"]);
      expect(seed.getByText(en.home.kind.artist)).toBeTruthy();
      expect(seed.getByText("By Item Album Seed One")).toBeTruthy();
      expect(seed.queryByText(en.home.kind.album)).toBeNull();
      const covers = seed.getAllByTestId("cover-single");
      expect(covers.map(coverRadius)).toEqual([radius.full, covers.map(coverRadius)[1]]);
      expect(covers.map(coverRadius)[1]).not.toBe(radius.full);
    });

    it("opens a recommended album and a recommended artist", async () => {
      await setup(full);
      await fireEvent.press(await screen.findByRole("button", { name: "For You Artist-Seeded" }));
      expect(mockPush).toHaveBeenLastCalledWith({
        pathname: "/album/[id]",
        params: { id: "MPREfy1" },
      });
      await fireEvent.press(screen.getByRole("button", { name: "Rec Artist" }));
      expect(mockPush).toHaveBeenLastCalledWith({
        pathname: "/artist/[id]",
        params: { id: "UCra1" },
      });
      await fireEvent.press(screen.getByRole("button", { name: "Item Artist Seed One" }));
      expect(mockPush).toHaveBeenLastCalledWith({
        pathname: "/artist/[id]",
        params: { id: "UCi1" },
      });
      await fireEvent.press(screen.getByRole("button", { name: "Item Album Seed One" }));
      expect(mockPush).toHaveBeenLastCalledWith({
        pathname: "/album/[id]",
        params: { id: "MPREi1" },
      });
    });

    it("draws skeletons in place of the recommendation sections while they load, with recents and playlists shown", async () => {
      await setup({ ...full, generateRecommendations: () => new Promise(() => undefined) });
      expect(await screen.findByText(en.home.recents)).toBeTruthy();
      expect(screen.getByText(en.home.playlists)).toBeTruthy();
      expect(screen.getAllByTestId("carousel-skeleton")).toHaveLength(6);
      expect(screen.getAllByLabelText(en.common.loading)).toHaveLength(1);
      expect(screen.queryByText(en.home.empty)).toBeNull();
    });

    it("draws skeletons, not the empty state, while recommendations load and the rest is empty", async () => {
      await setup({ generateRecommendations: () => new Promise(() => undefined) });
      expect(await screen.findAllByTestId("carousel-skeleton")).toHaveLength(6);
      expect(screen.queryByText(en.home.empty)).toBeNull();
    });

    const failures: [string, HttpOutcome<Recommendations>][] = [
      ["unauthorized", { kind: "api_failure", reason: "unauthorized" }],
      ["upstream_error", { kind: "api_failure", reason: "upstream_error" }],
      ["upstream_timeout", { kind: "api_failure", reason: "upstream_timeout" }],
      ["a timeout", { kind: "transport_failure", cause: "timeout" }],
    ];
    it.each(failures)(
      "hides the recommendation sections on %s and draws the error with retry, keeping recents and playlists",
      async (_name, outcome) => {
        const ctx = await setup({
          ...full,
          generateRecommendations: () => Promise.resolve(outcome),
        });
        const error = within(await screen.findByTestId("recommendations-error"));
        expect(error.getByText(en.common.error.generic)).toBeTruthy();
        expect(screen.queryByTestId("carousel-skeleton")).toBeNull();
        for (const id of ids.filter((id) => id.startsWith("rec-"))) {
          expect(screen.queryByTestId(id)).toBeNull();
        }
        expect(screen.getByText(en.home.recents)).toBeTruthy();
        expect(screen.getByText(en.home.playlists)).toBeTruthy();
        await fireEvent.press(error.getByText(en.common.retry));
        await waitFor(() => {
          expect(ctx.generateRecommendations).toHaveBeenCalledTimes(2);
        });
        expect(ctx.listRecents).toHaveBeenCalledTimes(1);
        expect(ctx.listPlaylists).toHaveBeenCalledTimes(1);
      },
    );

    it("draws the error with retry, not the empty state, when recommendations fail and the rest is empty", async () => {
      await setup({
        generateRecommendations: () =>
          Promise.resolve({ kind: "api_failure", reason: "upstream_error" }),
      });
      expect(await screen.findByTestId("recommendations-error")).toBeTruthy();
      expect(screen.queryByText(en.home.empty)).toBeNull();
    });
  });
});

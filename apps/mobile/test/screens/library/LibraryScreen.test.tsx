// apps/mobile/test/screens/library/LibraryScreen.test.tsx
//
// Tests for the library tab.
//
// Tested:
// - LibraryScreen
// - CreatePlaylistSheet
//
// What is covered:
// - loading, the liked entry first then the rest in the API's order, the next page, the empty message, the generic error with retry
// - creating a playlist, the disabled and too-long name states, the inline failure, an omitted description, cancel, es
//
// Run with: pnpm --filter @beatly/mobile test -- LibraryScreen
//
// SEE: apps/mobile/src/screens/library/LibraryScreen.tsx

import type { HttpOutcome, LibraryEntry, PageResult } from "@beatly/core";
import { afterEach, describe, expect, it } from "@jest/globals";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { i18n } from "../../../src/adapters/i18n.ts";
import { resources } from "../../../src/i18n/resources.ts";
import { LibraryScreen } from "../../../src/screens/library/LibraryScreen.tsx";
import {
  createdPlaylistFixture,
  likedEntryFixture,
  makeCore,
  ownPlaylistEntryFixture,
  pageOf,
  savedAlbumEntryFixture,
  savedPlaylistEntryFixture,
  stateFlag,
  Wrapper,
} from "../../helpers/core.tsx";

afterEach(async () => {
  await i18n.changeLanguage("en");
});

const en = resources.en;

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

type Options = Parameters<typeof makeCore>[0];

async function setup(options: Options = {}) {
  const ctx = makeCore(options);
  await render(
    <Wrapper core={ctx.core}>
      <SafeAreaProvider initialMetrics={metrics}>
        <LibraryScreen />
      </SafeAreaProvider>
    </Wrapper>,
  );
  return ctx;
}

function full(
  items: LibraryEntry[] = [
    likedEntryFixture,
    ownPlaylistEntryFixture,
    savedAlbumEntryFixture,
    savedPlaylistEntryFixture,
  ],
) {
  return () => Promise.resolve(pageOf(items));
}

async function openSheet() {
  await screen.findByText(en.library.liked);
  await fireEvent.press(screen.getByRole("button", { name: en.library.create.open }));
  return screen.findByText(en.library.create.title);
}

describe("LibraryScreen", () => {
  it("draws the loading state while the library loads", async () => {
    await setup({ listLibrary: () => new Promise(() => undefined) });
    expect(screen.getByLabelText(en.common.loading)).toBeTruthy();
  });

  it("draws the liked entry first, then the rest in the API's order", async () => {
    await setup({ listLibrary: full() });
    await screen.findByText(en.library.liked);
    const rows = screen.getAllByTestId("library-entry");
    expect(rows).toHaveLength(4);
    const at = (index: number) => {
      const row = rows[index];
      if (row === undefined) throw new Error(`no row ${String(index)}`);
      return within(row);
    };
    const [liked, own, album, saved] = [at(0), at(1), at(2), at(3)];
    expect(liked.getByText(en.library.liked)).toBeTruthy();
    expect(liked.getByText("Playlist · You")).toBeTruthy();
    expect(liked.getByTestId("cover-tile")).toBeTruthy();
    expect(own.getByText("Road trip")).toBeTruthy();
    expect(own.getByText("Playlist · You")).toBeTruthy();
    expect(own.getByTestId("cover-mosaic")).toBeTruthy();
    expect(album.getByText("Saved album")).toBeTruthy();
    expect(album.getByText("Album · Some artist")).toBeTruthy();
    expect(album.getByTestId("cover-single")).toBeTruthy();
    expect(saved.getByText("Saved playlist")).toBeTruthy();
    expect(saved.getByText("Playlist")).toBeTruthy();
    expect(screen.queryByText(en.library.empty)).toBeNull();
  });

  it("loads the next page at the end of the list", async () => {
    const ctx = await setup({
      listLibrary: (cursor) =>
        Promise.resolve(
          cursor === null
            ? pageOf([likedEntryFixture], { has_more: true, next_cursor: "c1" })
            : pageOf([savedAlbumEntryFixture]),
        ),
    });
    await screen.findByText(en.library.liked);
    await fireEvent(screen.getByTestId("library-list"), "onEndReached");
    expect(await screen.findByText("Saved album")).toBeTruthy();
    expect(ctx.listLibrary).toHaveBeenLastCalledWith("c1");
  });

  it("draws the liked entry and the empty message when the library has nothing else", async () => {
    await setup();
    expect(await screen.findByText(en.library.liked)).toBeTruthy();
    expect(screen.getByText(en.library.empty)).toBeTruthy();
    expect(screen.queryByText(en.common.error.generic)).toBeNull();
  });

  it.each<[string, HttpOutcome<PageResult<never>>]>([
    ["an api failure", { kind: "api_failure", reason: "upstream_error" }],
    ["a transport failure", { kind: "transport_failure", cause: "timeout" }],
  ])("draws the generic error with retry on %s", async (_name, outcome) => {
    const ctx = await setup({ listLibrary: () => Promise.resolve(outcome) });
    expect(await screen.findByText(en.common.error.generic)).toBeTruthy();
    await fireEvent.press(screen.getByText(en.common.retry));
    await waitFor(() => {
      expect(ctx.listLibrary).toHaveBeenCalledTimes(2);
    });
  });

  it("creates a playlist and shows it in the list", async () => {
    const created = { ...ownPlaylistEntryFixture, id: "p9", title: "New one" };
    let calls = 0;
    const ctx = await setup({
      listLibrary: () => {
        calls += 1;
        return Promise.resolve(
          pageOf(calls === 1 ? [likedEntryFixture] : [likedEntryFixture, created]),
        );
      },
      createPlaylist: () =>
        Promise.resolve({ kind: "success", data: createdPlaylistFixture, maxAgeSeconds: 0 }),
    });
    await openSheet();
    await fireEvent.changeText(screen.getByLabelText(en.library.create.name), "  New one  ");
    await fireEvent.changeText(screen.getByLabelText(en.library.create.description), "  Fresh  ");
    await fireEvent(screen.getByLabelText(en.library.create.public), "valueChange", true);
    await fireEvent.press(screen.getByRole("button", { name: en.library.create.submit }));
    await waitFor(() => {
      expect(screen.queryByText(en.library.create.title)).toBeNull();
    });
    expect(ctx.createPlaylist).toHaveBeenCalledWith({
      title: "New one",
      description: "Fresh",
      is_public: true,
    });
    expect(await screen.findByText("New one")).toBeTruthy();
  });

  it.each(["", "   "])("keeps Create disabled while the name is %j", async (name) => {
    await setup();
    await openSheet();
    await fireEvent.changeText(screen.getByLabelText(en.library.create.name), name);
    expect(
      stateFlag(screen.getByRole("button", { name: en.library.create.submit }), "disabled"),
    ).toBe(true);
  });

  it("shows the too-long error inline above 200 characters", async () => {
    await setup();
    await openSheet();
    const field = screen.getByLabelText(en.library.create.name);
    await fireEvent.changeText(field, "a".repeat(201));
    expect(screen.getByText("Use 200 characters or fewer")).toBeTruthy();
    expect(
      stateFlag(screen.getByRole("button", { name: en.library.create.submit }), "disabled"),
    ).toBe(true);
    await fireEvent.changeText(field, "a".repeat(200));
    expect(screen.queryByText("Use 200 characters or fewer")).toBeNull();
    expect(
      stateFlag(screen.getByRole("button", { name: en.library.create.submit }), "disabled"),
    ).toBeFalsy();
  });

  it.each<[string, HttpOutcome<never>]>([
    ["an api failure", { kind: "api_failure", reason: "invalid_request" }],
    ["a transport failure", { kind: "transport_failure", cause: "network" }],
  ])(
    "shows the generic error inline and keeps the sheet open when creation fails with %s",
    async (_name, outcome) => {
      await setup({ createPlaylist: () => Promise.resolve(outcome) });
      await openSheet();
      await fireEvent.changeText(screen.getByLabelText(en.library.create.name), "Mine");
      await fireEvent.press(screen.getByRole("button", { name: en.library.create.submit }));
      expect(await screen.findByText(en.common.error.generic)).toBeTruthy();
      expect(screen.getByText(en.library.create.title)).toBeTruthy();
      expect(screen.getByDisplayValue("Mine")).toBeTruthy();
    },
  );

  it("omits the description when it is left empty", async () => {
    const ctx = await setup();
    await openSheet();
    await fireEvent.changeText(screen.getByLabelText(en.library.create.name), "Mine");
    await fireEvent.changeText(screen.getByLabelText(en.library.create.description), "   ");
    await fireEvent.press(screen.getByRole("button", { name: en.library.create.submit }));
    await waitFor(() => {
      expect(ctx.createPlaylist).toHaveBeenCalledWith({ title: "Mine", is_public: false });
    });
  });

  it("closes the sheet and clears the form on cancel", async () => {
    await setup();
    await openSheet();
    await fireEvent.changeText(screen.getByLabelText(en.library.create.name), "Mine");
    await fireEvent.press(screen.getByRole("button", { name: en.library.create.cancel }));
    await waitFor(() => {
      expect(screen.queryByText(en.library.create.title)).toBeNull();
    });
    await fireEvent.press(screen.getByRole("button", { name: en.library.create.open }));
    expect(await screen.findByText(en.library.create.title)).toBeTruthy();
    expect(screen.getByLabelText(en.library.create.name).props.value).toBe("");
  });

  it("draws the title, the liked entry and the empty message in Spanish", async () => {
    await i18n.changeLanguage("es");
    await setup();
    expect(await screen.findByText(resources.es.library.liked)).toBeTruthy();
    expect(screen.getByText(resources.es.library.title)).toBeTruthy();
    expect(screen.getByText(resources.es.library.empty)).toBeTruthy();
  });
});

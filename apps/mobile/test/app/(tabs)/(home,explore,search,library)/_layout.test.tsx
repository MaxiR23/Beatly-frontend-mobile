// apps/mobile/test/app/(tabs)/(home,explore,search,library)/_layout.test.tsx
//
// Tests for the stack shared by the four tabs.
//
// Tested:
// - the shared stack: a tab's root and the detail routes pushed over it
//
// What is covered:
// - opening a genre from explore and going back
// - opening an album from home recents, a search result, a saved album and the explore stack, back returning to the same tab
// - opening another album from an album's carousel and going back to the first album
//
// Run with: pnpm --filter @beatly/mobile test -- "(home,explore,search,library)/_layout"
//
// SEE: apps/mobile/app/(tabs)/(home,explore,search,library)/_layout.tsx

import { describe, expect, it, jest } from "@jest/globals";
import { router } from "expo-router";
import { act, fireEvent, renderRouter, screen } from "expo-router/testing-library";

import { resources } from "../../../../src/i18n/resources.ts";
import {
  albumFixture,
  genreFixture,
  pageOf,
  recentFixture,
  savedAlbumEntryFixture,
} from "../../../helpers/core.tsx";
import { installCore } from "../../../helpers/routeCore.ts";

jest.mock("../../../../src/createCore.ts", () => ({ createCore: () => mockCore.current }));
jest.mock("../../../../src/adapters/imageColors.ts", () => ({
  getDominantColor: () => Promise.resolve({ kind: "unavailable" }),
  peekDominantColor: () => undefined,
}));
const mockCore = installCore();

const en = resources.en;

function isSelected(node: { props: unknown }): unknown {
  const props = node.props as { accessibilityState?: { selected?: unknown } };
  return props.accessibilityState?.selected;
}

function backButton() {
  return screen.getByRole("button", { name: en.album.back });
}

describe("the shared tab stack", () => {
  it("opens a genre from explore and goes back", async () => {
    mockCore.set("signed_in", { listGenres: () => Promise.resolve(pageOf([genreFixture])) });
    await renderRouter("app", { initialUrl: "/" });
    await screen.findByTestId("home");
    await fireEvent.press(screen.getByRole("tab", { name: en.tabs.explore }));
    await screen.findByTestId("explore");
    await fireEvent.press(await screen.findByRole("button", { name: "Pop" }));
    const genre = await screen.findByTestId("genre");
    expect(genre).toBeTruthy();
    expect(screen.getByText("Pop")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: en.genre.back }));
    expect(await screen.findByTestId("explore")).toBeTruthy();
  });

  it("opens an album from home recents and back returns to home with home selected", async () => {
    mockCore.set("signed_in", { listRecents: () => Promise.resolve(pageOf([recentFixture])) });
    await renderRouter("app", { initialUrl: "/" });
    await fireEvent.press(await screen.findByRole("button", { name: "Recent album" }));
    expect(await screen.findByTestId("album")).toBeTruthy();
    expect((await screen.findAllByText("Test Album")).length).toBeGreaterThan(0);
    await fireEvent.press(backButton());
    expect(await screen.findByTestId("home")).toBeTruthy();
    expect(isSelected(screen.getByRole("tab", { name: en.tabs.home }))).toBe(true);
  });

  it("opens an album from a search result and back returns to search with search selected", async () => {
    mockCore.set("signed_in");
    await renderRouter("app", { initialUrl: "/" });
    await screen.findByTestId("home");
    await fireEvent.press(screen.getByRole("tab", { name: en.tabs.search }));
    await screen.findByTestId("search");
    await fireEvent.changeText(screen.getByPlaceholderText(en.search.placeholder), "test");
    await fireEvent.press(await screen.findByRole("button", { name: "Test Album" }));
    expect(await screen.findByTestId("album")).toBeTruthy();
    await fireEvent.press(backButton());
    expect(await screen.findByTestId("search")).toBeTruthy();
    expect(isSelected(screen.getByRole("tab", { name: en.tabs.search }))).toBe(true);
  });

  it("opens an album from a saved album in library and back returns to library", async () => {
    mockCore.set("signed_in", {
      listLibrary: () => Promise.resolve(pageOf([savedAlbumEntryFixture])),
    });
    await renderRouter("app", { initialUrl: "/" });
    await screen.findByTestId("home");
    await fireEvent.press(screen.getByRole("tab", { name: en.tabs.library }));
    await fireEvent.press(await screen.findByRole("button", { name: "Saved album" }));
    expect(await screen.findByTestId("album")).toBeTruthy();
    await fireEvent.press(backButton());
    expect(await screen.findByTestId("library")).toBeTruthy();
    expect(isSelected(screen.getByRole("tab", { name: en.tabs.library }))).toBe(true);
  });

  it("opens an album from the explore tab's stack and keeps explore selected", async () => {
    mockCore.set("signed_in");
    await renderRouter("app", { initialUrl: "/" });
    await screen.findByTestId("home");
    await fireEvent.press(screen.getByRole("tab", { name: en.tabs.explore }));
    await screen.findByTestId("explore");
    await act(async () => {
      router.push({ pathname: "/album/[id]", params: { id: "MPREb_1" } });
      await Promise.resolve();
    });
    expect(await screen.findByTestId("album")).toBeTruthy();
    expect(isSelected(screen.getByRole("tab", { name: en.tabs.explore }))).toBe(true);
    await fireEvent.press(backButton());
    expect(await screen.findByTestId("explore")).toBeTruthy();
  });

  it("opens another album from an album's carousel and back returns to the first album", async () => {
    mockCore.set("signed_in", {
      getAlbum: (id) =>
        Promise.resolve({
          kind: "success",
          maxAgeSeconds: 0,
          data:
            id === "MPREb_2"
              ? { ...albumFixture, id, title: "Second Album", other_versions: [] }
              : albumFixture,
        }),
    });
    await renderRouter("app", { initialUrl: "/" });
    await screen.findByTestId("home");
    await act(async () => {
      router.push({ pathname: "/album/[id]", params: { id: "MPREb_1" } });
      await Promise.resolve();
    });
    await fireEvent.press(await screen.findByRole("button", { name: "Other Version" }));
    expect((await screen.findAllByText("Second Album")).length).toBeGreaterThan(0);
    await fireEvent.press(backButton());
    expect((await screen.findAllByText("Test Album")).length).toBeGreaterThan(0);
    expect(screen.queryByText("Second Album")).toBeNull();
  });
});

// apps/mobile/test/screens/explore/ExploreScreen.test.tsx
//
// Tests for the explore tab.
//
// Tested:
// - ExploreScreen
//
// What is covered:
// - loading, the genres in API order, the push to a genre, the empty state, the error with its cause and retry
// - offline: a network failure draws the offline cause and loads by itself when the connection returns; a screen opened offline draws the offline cause without calling the route and loads when it returns
// - the account sheet, en and es
//
// Run with: pnpm --filter @beatly/mobile test -- ExploreScreen
//
// SEE: apps/mobile/src/screens/explore/ExploreScreen.tsx

import type { HttpOutcome, PageResult } from "@beatly/core";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { onlineManager } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { i18n } from "../../../src/adapters/i18n.ts";
import { resources } from "../../../src/i18n/resources.ts";
import { ExploreScreen } from "../../../src/screens/explore/ExploreScreen.tsx";
import { genreFixture, makeCore, pageOf, Wrapper } from "../../helpers/core.tsx";
import { Insets } from "../../helpers/insets.tsx";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

afterEach(async () => {
  onlineManager.setOnline(true);
  mockPush.mockClear();
  await i18n.changeLanguage("en");
});

const en = resources.en;

async function setup(options: Parameters<typeof makeCore>[0] = {}) {
  const ctx = makeCore(options);
  await render(
    <Wrapper core={ctx.core}>
      <Insets>
        <ExploreScreen />
      </Insets>
    </Wrapper>,
  );
  return ctx;
}

const genres = [
  genreFixture,
  { slug: "rock", name: "Rock", description: null },
  { slug: "jazz", name: "Jazz", description: null },
];

const failure: HttpOutcome<PageResult<never>> = { kind: "api_failure", reason: "upstream_error" };

describe("ExploreScreen", () => {
  it("draws the loading state while genres load", async () => {
    await setup({ listGenres: () => new Promise(() => undefined) });
    expect(screen.getByLabelText(en.common.loading)).toBeTruthy();
    expect(screen.getByText(en.explore.title)).toBeTruthy();
  });

  it("draws the genres in the order the API sends them", async () => {
    await setup({ listGenres: () => Promise.resolve(pageOf(genres)) });
    await screen.findByText("Pop");
    const labels = screen
      .getAllByRole("button")
      .map((button) => button.props.accessibilityLabel as string);
    expect(labels).toEqual([en.common.account.open, "Pop", "Rock", "Jazz"]);
  });

  it("opens the genre screen with its slug and name from a row", async () => {
    await setup({ listGenres: () => Promise.resolve(pageOf(genres)) });
    await fireEvent.press(await screen.findByRole("button", { name: "Pop" }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/explore/genres/[slug]",
      params: { slug: "pop", name: "Pop" },
    });
  });

  it("draws the empty state with no retry when there are no genres", async () => {
    await setup();
    expect(await screen.findByText(en.explore.empty)).toBeTruthy();
    expect(screen.queryByText(en.common.retry)).toBeNull();
  });

  it("draws the offline cause and loads by itself when the connection returns", async () => {
    const listGenres = jest
      .fn<ReturnType<typeof makeCore>["listGenres"]>()
      .mockResolvedValueOnce({ kind: "transport_failure", cause: "network" })
      .mockResolvedValue(pageOf(genres));
    await setup({ listGenres });
    expect(await screen.findByText(en.common.error.offline.title)).toBeTruthy();
    await act(() => {
      onlineManager.setOnline(false);
    });
    await act(() => {
      onlineManager.setOnline(true);
    });
    expect(await screen.findByText("Pop")).toBeTruthy();
    expect(screen.queryByText(en.common.error.offline.title)).toBeNull();
    expect(listGenres).toHaveBeenCalledTimes(2);
  });

  it("draws the offline cause for a screen opened offline and loads when the connection returns", async () => {
    onlineManager.setOnline(false);
    const ctx = await setup({ listGenres: () => Promise.resolve(pageOf(genres)) });
    expect(await screen.findByText(en.common.error.offline.title)).toBeTruthy();
    expect(ctx.listGenres).not.toHaveBeenCalled();
    await act(() => {
      onlineManager.setOnline(true);
    });
    expect(await screen.findByText("Pop")).toBeTruthy();
    expect(ctx.listGenres).toHaveBeenCalledTimes(1);
  });

  it("draws the server cause and retries", async () => {
    const ctx = await setup({ listGenres: () => Promise.resolve(failure) });
    expect(await screen.findByText(en.common.error.server.title)).toBeTruthy();
    await fireEvent.press(screen.getByText(en.common.retry));
    await waitFor(() => {
      expect(ctx.listGenres).toHaveBeenCalledTimes(2);
    });
  });

  it("opens the account sheet from the avatar", async () => {
    const ctx = await setup();
    await screen.findByText(en.explore.empty);
    await fireEvent.press(screen.getByRole("button", { name: en.common.account.open }));
    await fireEvent.press(await screen.findByRole("button", { name: en.common.account.logout }));
    await waitFor(() => {
      expect(ctx.auth.signOut).toHaveBeenCalledTimes(1);
    });
  });

  it("draws in es", async () => {
    await i18n.changeLanguage("es");
    await setup({ listGenres: () => Promise.resolve(pageOf(genres)) });
    expect(await screen.findByText(resources.es.explore.title)).toBeTruthy();
  });
});

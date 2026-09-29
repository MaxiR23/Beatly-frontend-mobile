// apps/mobile/test/screens/explore/ExploreScreen.test.tsx
//
// Tests for the explore tab.
//
// Tested:
// - ExploreScreen
//
// What is covered:
// - loading, the genres in API order, the push to a genre, the empty state, the generic error with retry
// - the account sheet, en and es
//
// Run with: pnpm --filter @beatly/mobile test -- ExploreScreen
//
// SEE: apps/mobile/src/screens/explore/ExploreScreen.tsx

import type { HttpOutcome, PageResult } from "@beatly/core";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { i18n } from "../../../src/adapters/i18n.ts";
import { resources } from "../../../src/i18n/resources.ts";
import { ExploreScreen } from "../../../src/screens/explore/ExploreScreen.tsx";
import { genreFixture, makeCore, pageOf, Wrapper } from "../../helpers/core.tsx";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

afterEach(async () => {
  mockPush.mockClear();
  await i18n.changeLanguage("en");
});

const en = resources.en;

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

async function setup(options: Parameters<typeof makeCore>[0] = {}) {
  const ctx = makeCore(options);
  await render(
    <Wrapper core={ctx.core}>
      <SafeAreaProvider initialMetrics={metrics}>
        <ExploreScreen />
      </SafeAreaProvider>
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

  it("draws the generic error and retries", async () => {
    const ctx = await setup({ listGenres: () => Promise.resolve(failure) });
    expect(await screen.findByText(en.common.error.generic)).toBeTruthy();
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

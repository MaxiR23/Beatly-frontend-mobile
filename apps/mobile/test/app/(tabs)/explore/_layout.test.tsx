// apps/mobile/test/app/(tabs)/explore/_layout.test.tsx
//
// Tests for the explore tab's stack.
//
// Tested:
// - the explore stack: the genre list and a genre pushed over it
//
// What is covered:
// - opening a genre from explore and going back
//
// Run with: pnpm --filter @beatly/mobile test -- explore/_layout
//
// SEE: apps/mobile/app/(tabs)/explore/_layout.tsx

import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, renderRouter, screen } from "expo-router/testing-library";

import { resources } from "../../../../src/i18n/resources.ts";
import { genreFixture, pageOf } from "../../../helpers/core.tsx";
import { installCore } from "../../../helpers/routeCore.ts";

jest.mock("../../../../src/createCore.ts", () => ({ createCore: () => mockCore.current }));
const mockCore = installCore();

const en = resources.en;

describe("the explore stack", () => {
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
});

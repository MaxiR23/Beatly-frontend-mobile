// apps/mobile/test/app/player.test.tsx
//
// Tests for the player route.
//
// Tested:
// - the player route behind the session gate
//
// What is covered:
// - signed in draws the player, signed out does not reach it
//
// Run with: pnpm --filter @beatly/mobile test -- app/player
//
// SEE: apps/mobile/app/player.tsx, apps/mobile/app/_layout.tsx

import { describe, expect, it, jest } from "@jest/globals";
import { router } from "expo-router";
import { act, renderRouter, screen } from "expo-router/testing-library";

import { installCore } from "../helpers/routeCore.ts";

jest.mock("../../src/createCore.ts", () => ({ createCore: () => mockCore.current }));
const mockCore = installCore();

describe("the player route", () => {
  it("draws the player when signed in", async () => {
    mockCore.set("signed_in");
    await renderRouter("app", { initialUrl: "/" });
    await screen.findByTestId("home");
    await act(() => {
      router.push("/player");
      return Promise.resolve();
    });
    expect(await screen.findByTestId("player")).toBeTruthy();
  });

  it("does not draw the player when signed out", async () => {
    mockCore.set("signed_out");
    await renderRouter("app", { initialUrl: "/" });
    expect(await screen.findByTestId("login")).toBeTruthy();
    expect(screen.queryByTestId("player")).toBeNull();
  });
});

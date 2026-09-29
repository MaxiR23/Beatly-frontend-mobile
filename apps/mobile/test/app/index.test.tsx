// apps/mobile/test/app/index.test.tsx
//
// Tests for the index route and the session gate of the root layout.
//
// Tested:
// - the index route behind the session gate
// - the stack header
//
// What is covered:
// - signed out, "/" draws login; signed in, "/" draws home; the stack header is hidden
//
// Run with: pnpm --filter @beatly/mobile test -- index
//
// SEE: apps/mobile/app/(tabs)/index.tsx, apps/mobile/app/_layout.tsx

import { describe, expect, it, jest } from "@jest/globals";
import { renderRouter, screen } from "expo-router/testing-library";

import { installCore } from "../helpers/routeCore.ts";

jest.mock("../../src/createCore.ts", () => ({ createCore: () => mockCore.current }));
const mockCore = installCore();

describe("the index route", () => {
  it("draws the login screen when signed out", async () => {
    mockCore.set("signed_out");
    await renderRouter("app", { initialUrl: "/" });
    expect(await screen.findByTestId("login")).toBeTruthy();
  });

  it("draws the home screen when signed in", async () => {
    mockCore.set("signed_in");
    await renderRouter("app", { initialUrl: "/" });
    expect(await screen.findByTestId("home")).toBeTruthy();
  });

  it("hides the stack header", async () => {
    mockCore.set("signed_in");
    await renderRouter("app", { initialUrl: "/" });
    await screen.findByTestId("home");
    expect(screen.queryByText("index")).toBeNull();
  });
});

// apps/mobile/test/app/login.test.tsx
//
// Tests for the login route.
//
// Tested:
// - the login route behind the session gate
//
// What is covered:
// - signed out draws login; signed in lands on home
//
// Run with: pnpm --filter @beatly/mobile test -- login
//
// SEE: apps/mobile/app/login.tsx, apps/mobile/app/_layout.tsx

import { describe, expect, it, jest } from "@jest/globals";
import { renderRouter, screen } from "expo-router/testing-library";

import { installCore } from "../helpers/routeCore.ts";

jest.mock("../../src/createCore.ts", () => ({ createCore: () => mockCore.current }));
const mockCore = installCore();

describe("the login route", () => {
  it("draws the login screen when signed out", async () => {
    mockCore.set("signed_out");
    await renderRouter("app", { initialUrl: "/login" });
    expect(await screen.findByTestId("login")).toBeTruthy();
  });

  it("lands on home when signed in", async () => {
    mockCore.set("signed_in");
    await renderRouter("app", { initialUrl: "/login" });
    expect(await screen.findByTestId("home")).toBeTruthy();
  });
});

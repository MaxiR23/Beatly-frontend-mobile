// apps/mobile/test/app/sign-up.test.tsx
//
// Tests for the sign up route.
//
// Tested:
// - the sign up route behind the session gate
//
// What is covered:
// - signed out reaches sign up from login; a cold start on /sign-up lands on login (known edge); signed in lands on home
//
// Run with: pnpm --filter @beatly/mobile test -- sign-up
//
// SEE: apps/mobile/app/sign-up.tsx, apps/mobile/app/_layout.tsx

import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, renderRouter, screen } from "expo-router/testing-library";

import { resources } from "../../src/i18n/resources.ts";
import { installCore } from "../helpers/routeCore.ts";

jest.mock("../../src/createCore.ts", () => ({ createCore: () => mockCore.current }));
const mockCore = installCore();
const en = resources.en;

describe("the sign up route", () => {
  it("draws the sign up screen when signed out, from login", async () => {
    mockCore.set("signed_out");
    await renderRouter("app", { initialUrl: "/" });
    await screen.findByTestId("login");
    await fireEvent.press(screen.getByRole("link", { name: en.login.goToSignUp }));
    expect(await screen.findByTestId("signUp")).toBeTruthy();
  });

  it("lands on login on a cold start on /sign-up when signed out", async () => {
    mockCore.set("signed_out");
    await renderRouter("app", { initialUrl: "/sign-up" });
    expect(await screen.findByTestId("login")).toBeTruthy();
    expect(screen.queryByTestId("signUp")).toBeNull();
  });

  it("lands on home when signed in", async () => {
    mockCore.set("signed_in");
    await renderRouter("app", { initialUrl: "/sign-up" });
    expect(await screen.findByTestId("home")).toBeTruthy();
  });
});

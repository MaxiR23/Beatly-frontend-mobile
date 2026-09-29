// apps/mobile/test/screens/home/HomeScreen.test.tsx
//
// Tests for the signed-in placeholder screen.
//
// Tested:
// - HomeScreen
//
// What is covered:
// - loading, the greeting and its fallbacks, profile_not_found, a generic failure with retry, log out, en and es
//
// Run with: pnpm --filter @beatly/mobile test -- HomeScreen
//
// SEE: apps/mobile/src/screens/home/HomeScreen.tsx

import type { HttpOutcome, Profile } from "@beatly/core";
import { afterEach, describe, expect, it } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { i18n } from "../../../src/adapters/i18n.ts";
import { resources } from "../../../src/i18n/resources.ts";
import { HomeScreen } from "../../../src/screens/home/HomeScreen.tsx";
import { makeCore, profileFixture, successOf, Wrapper } from "../../helpers/core.tsx";

afterEach(async () => {
  await i18n.changeLanguage("en");
});

const en = resources.en;

async function setup(outcome: HttpOutcome<Profile> | Promise<HttpOutcome<Profile>>) {
  const ctx = makeCore({ getMyProfile: () => Promise.resolve(outcome) });
  await render(
    <Wrapper core={ctx.core}>
      <HomeScreen />
    </Wrapper>,
  );
  return ctx;
}

describe("HomeScreen", () => {
  it("draws the loading state while the profile loads", async () => {
    const ctx = makeCore({ getMyProfile: () => new Promise(() => undefined) });
    await render(
      <Wrapper core={ctx.core}>
        <HomeScreen />
      </Wrapper>,
    );
    expect(screen.getByLabelText(en.common.loading)).toBeTruthy();
  });

  it("greets by username", async () => {
    await setup(successOf(profileFixture));
    expect(await screen.findByText("Hi, maxi_23")).toBeTruthy();
  });

  it("falls back to the display name when the username is null", async () => {
    await setup(successOf({ ...profileFixture, username: null }));
    expect(await screen.findByText("Hi, Maxi")).toBeTruthy();
  });

  it("draws greetingNoName when both names are null", async () => {
    await setup(successOf({ ...profileFixture, username: null, display_name: null }));
    expect(await screen.findByText(en.home.greetingNoName)).toBeTruthy();
  });

  it("draws profileNotFound and its action signs out", async () => {
    const ctx = await setup({ kind: "api_failure", reason: "profile_not_found" });
    expect(await screen.findByText(en.home.profileNotFound)).toBeTruthy();
    await fireEvent.press(screen.getByText(en.home.logout));
    await waitFor(() => {
      expect(ctx.auth.signOut).toHaveBeenCalledTimes(1);
    });
  });

  it("shows a busy logout while signing out from profileNotFound", async () => {
    const ctx = makeCore({
      getMyProfile: () => Promise.resolve({ kind: "api_failure", reason: "profile_not_found" }),
    });
    ctx.auth.signOut.mockImplementation(() => new Promise(() => undefined));
    await render(
      <Wrapper core={ctx.core}>
        <HomeScreen />
      </Wrapper>,
    );
    await fireEvent.press(await screen.findByText(en.home.logout));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: en.home.logout }).props.accessibilityState).toEqual(
        expect.objectContaining({ busy: true }),
      );
    });
  });

  it("draws the generic error when signing out from profileNotFound fails", async () => {
    const ctx = makeCore({
      getMyProfile: () => Promise.resolve({ kind: "api_failure", reason: "profile_not_found" }),
    });
    ctx.auth.signOut.mockImplementation(() =>
      Promise.resolve({ kind: "failure", reason: "unknown" }),
    );
    await render(
      <Wrapper core={ctx.core}>
        <HomeScreen />
      </Wrapper>,
    );
    await fireEvent.press(await screen.findByText(en.home.logout));
    expect(await screen.findByText(en.common.error.generic)).toBeTruthy();
  });

  it("draws the generic error for any other failure and retry refetches", async () => {
    const ctx = await setup({ kind: "api_failure", reason: "upstream_error" });
    expect(await screen.findByText(en.common.error.generic)).toBeTruthy();
    await fireEvent.press(screen.getByText(en.common.retry));
    await waitFor(() => {
      expect(ctx.getMyProfile).toHaveBeenCalledTimes(2);
    });
  });

  it("signs out from the log out button", async () => {
    const ctx = await setup(successOf(profileFixture));
    await fireEvent.press(await screen.findByText(en.home.logout));
    await waitFor(() => {
      expect(ctx.auth.signOut).toHaveBeenCalledTimes(1);
    });
  });

  it("draws in es", async () => {
    await i18n.changeLanguage("es");
    await setup(successOf(profileFixture));
    expect(await screen.findByText("Hola, maxi_23")).toBeTruthy();
    expect(screen.getByText(resources.es.home.logout)).toBeTruthy();
  });
});

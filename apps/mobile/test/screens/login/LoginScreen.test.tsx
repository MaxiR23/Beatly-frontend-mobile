// apps/mobile/test/screens/login/LoginScreen.test.tsx
//
// Tests for the login screen.
//
// Tested:
// - LoginScreen
//
// What is covered:
// - the form in en and es, the submit rules, the mapped failure messages, navigation to sign up
//
// Run with: pnpm --filter @beatly/mobile test -- LoginScreen
//
// SEE: apps/mobile/src/screens/login/LoginScreen.tsx

import type { AuthFailureReason, AuthResult } from "@beatly/core";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { i18n } from "../../../src/adapters/i18n.ts";
import { resources } from "../../../src/i18n/resources.ts";
import { LoginScreen } from "../../../src/screens/login/LoginScreen.tsx";
import { makeAuth, makeCore, stateFlag, Wrapper } from "../../helpers/core.tsx";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
}));

afterEach(async () => {
  mockPush.mockClear();
  await i18n.changeLanguage("en");
});

async function setup(result?: AuthResult | Promise<AuthResult>) {
  const auth = makeAuth();
  if (result !== undefined) auth.signIn.mockImplementation(() => Promise.resolve(result));
  const { core } = makeCore({ auth });
  await render(
    <Wrapper core={core}>
      <LoginScreen />
    </Wrapper>,
  );
  return auth;
}

async function fill() {
  await fireEvent.changeText(screen.getByLabelText("Email"), "  maxi@example.com ");
  await fireEvent.changeText(screen.getByLabelText("Password"), "secret1");
}

describe("LoginScreen", () => {
  it("draws the form in en", async () => {
    await setup();
    const r = resources.en.login;
    expect(screen.getAllByText(r.title)).toHaveLength(2);
    expect(screen.getByLabelText(r.email)).toBeTruthy();
    expect(screen.getByLabelText(r.password)).toBeTruthy();
    expect(screen.getByText(r.noAccount)).toBeTruthy();
    expect(screen.getByText(r.goToSignUp)).toBeTruthy();
  });

  it("draws the form in es", async () => {
    await i18n.changeLanguage("es");
    await setup();
    const r = resources.es.login;
    expect(screen.getByLabelText(r.password)).toBeTruthy();
    expect(screen.getByText(r.noAccount)).toBeTruthy();
    expect(screen.getByText(r.goToSignUp)).toBeTruthy();
  });

  it("disables the submit while a field is empty", async () => {
    await setup();
    const submit = screen.getByRole("button", { name: resources.en.login.submit });
    expect(stateFlag(submit, "disabled")).toBe(true);
    await fill();
    expect(
      stateFlag(screen.getByRole("button", { name: resources.en.login.submit }), "disabled"),
    ).toBe(false);
  });

  it("calls signIn with the trimmed email", async () => {
    const auth = await setup();
    await fill();
    await fireEvent.press(screen.getByRole("button", { name: resources.en.login.submit }));
    await waitFor(() => {
      expect(auth.signIn).toHaveBeenCalledWith({ email: "maxi@example.com", password: "secret1" });
    });
  });

  it("marks the submit busy while pending", async () => {
    await setup(new Promise<AuthResult>(() => undefined));
    await fill();
    await fireEvent.press(screen.getByRole("button", { name: resources.en.login.submit }));
    await waitFor(() => {
      expect(
        stateFlag(screen.getByRole("button", { name: resources.en.login.submit }), "busy"),
      ).toBe(true);
    });
  });

  it.each<[AuthFailureReason, string]>([
    ["invalid_credentials", resources.en.login.errors.invalidCredentials],
    ["email_not_confirmed", resources.en.login.errors.emailNotConfirmed],
    ["rate_limited", resources.en.login.errors.rateLimited],
    ["unknown", resources.en.common.error.generic],
  ])("draws the message of %s", async (reason, text) => {
    await setup({ kind: "failure", reason });
    await fill();
    await fireEvent.press(screen.getByRole("button", { name: resources.en.login.submit }));
    expect(await screen.findByText(text)).toBeTruthy();
  });

  it("navigates to sign up", async () => {
    await setup();
    await fireEvent.press(screen.getByText(resources.en.login.goToSignUp));
    expect(mockPush).toHaveBeenCalledWith("/sign-up");
  });
});

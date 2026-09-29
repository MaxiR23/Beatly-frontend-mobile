// apps/mobile/test/screens/signUp/SignUpScreen.test.tsx
//
// Tests for the sign up screen.
//
// Tested:
// - SignUpScreen
//
// What is covered:
// - the form in en and es, the live rule row, the submit rules, the name length, the mapped failures, the confirmation state
//
// Run with: pnpm --filter @beatly/mobile test -- SignUpScreen
//
// SEE: apps/mobile/src/screens/signUp/SignUpScreen.tsx

import type { AuthFailureReason, SignUpResult } from "@beatly/core";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { i18n } from "../../../src/adapters/i18n.ts";
import { resources } from "../../../src/i18n/resources.ts";
import { SignUpScreen } from "../../../src/screens/signUp/SignUpScreen.tsx";
import { makeAuth, makeCore, stateFlag, Wrapper } from "../../helpers/core.tsx";

const mockReplace = jest.fn();
const mockBack = jest.fn();
let mockCanGoBack = true;
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: mockReplace,
    back: mockBack,
    canGoBack: () => mockCanGoBack,
  }),
}));

afterEach(async () => {
  mockReplace.mockClear();
  mockBack.mockClear();
  mockCanGoBack = true;
  await i18n.changeLanguage("en");
});

const en = resources.en;

async function setup(result?: SignUpResult) {
  const auth = makeAuth();
  if (result !== undefined) auth.signUp.mockImplementation(() => Promise.resolve(result));
  const { core } = makeCore({ auth });
  await render(
    <Wrapper core={core}>
      <SignUpScreen />
    </Wrapper>,
  );
  return auth;
}

async function fill(password = "secret1") {
  await fireEvent.changeText(screen.getByLabelText(en.signUp.name), " Maxi ");
  await fireEvent.changeText(screen.getByLabelText(en.signUp.email), " maxi@example.com ");
  await fireEvent.changeText(screen.getByLabelText(en.signUp.password), password);
}

const submitButton = () => screen.getByRole("button", { name: en.signUp.submit });

describe("SignUpScreen", () => {
  it("draws the form in en", async () => {
    await setup();
    expect(screen.getByText(en.signUp.title)).toBeTruthy();
    expect(screen.getByText(en.signUp.rules.minLength.replace("{{min}}", "6"))).toBeTruthy();
    expect(screen.getByText(en.signUp.haveAccount)).toBeTruthy();
  });

  it("draws the form in es", async () => {
    await i18n.changeLanguage("es");
    await setup();
    const es = resources.es.signUp;
    expect(screen.getByText(es.title)).toBeTruthy();
    expect(screen.getByText(es.rules.minLength.replace("{{min}}", "6"))).toBeTruthy();
    expect(screen.getByText(es.haveAccount)).toBeTruthy();
  });

  it("switches the rule row from unmet to met as the password is typed", async () => {
    await setup();
    const label = en.signUp.rules.minLength.replace("{{min}}", "6");
    const row = () => screen.getByText(label).parent;
    expect(stateFlag(row() ?? { props: {} }, "checked")).toBe(false);
    await fireEvent.changeText(screen.getByLabelText(en.signUp.password), "123456");
    expect(stateFlag(row() ?? { props: {} }, "checked")).toBe(true);
  });

  it("disables the submit until the form can be submitted", async () => {
    await setup();
    expect(stateFlag(submitButton(), "disabled")).toBe(true);
    await fill("123");
    expect(stateFlag(submitButton(), "disabled")).toBe(true);
    await fill();
    expect(stateFlag(submitButton(), "disabled")).toBe(false);
  });

  it("calls signUp with the trimmed name and email", async () => {
    const auth = await setup();
    await fill();
    await fireEvent.press(submitButton());
    await waitFor(() => {
      expect(auth.signUp).toHaveBeenCalledWith({
        name: "Maxi",
        email: "maxi@example.com",
        password: "secret1",
      });
    });
  });

  it("shows nameTooLong for a name over 50 characters", async () => {
    await setup();
    await fireEvent.changeText(screen.getByLabelText(en.signUp.name), "a".repeat(51));
    expect(screen.getByText(en.signUp.nameTooLong.replace("{{max}}", "50"))).toBeTruthy();
  });

  it.each<[AuthFailureReason, string]>([
    ["weak_password", en.signUp.errors.weakPassword],
    ["user_already_exists", en.signUp.errors.userAlreadyExists],
    ["invalid_email", en.signUp.errors.invalidEmail],
    ["rate_limited", en.signUp.errors.rateLimited],
    ["unknown", en.common.error.generic],
  ])("draws the message of %s", async (reason, text) => {
    await setup({ kind: "failure", reason });
    await fill();
    await fireEvent.press(submitButton());
    expect(await screen.findByText(text)).toBeTruthy();
  });

  it("draws the check your email state after confirmation_sent", async () => {
    await setup({ kind: "confirmation_sent" });
    await fill();
    await fireEvent.press(submitButton());
    expect(
      await screen.findByText(en.signUp.sent.message.replace("{{email}}", "maxi@example.com")),
    ).toBeTruthy();
    await fireEvent.press(screen.getByText(en.signUp.sent.backToLogin));
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("goes back to the login below it instead of stacking a second one", async () => {
    await setup();
    await fireEvent.press(screen.getByText(en.signUp.goToLogin));
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("replaces with login when there is nothing to go back to", async () => {
    mockCanGoBack = false;
    await setup();
    await fireEvent.press(screen.getByText(en.signUp.goToLogin));
    expect(mockReplace).toHaveBeenCalledWith("/login");
    expect(mockBack).not.toHaveBeenCalled();
  });
});

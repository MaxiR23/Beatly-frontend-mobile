// apps/mobile/test/screens/authCallback/AuthCallbackScreen.test.tsx
//
// Tests for the email link callback screen.
//
// Tested:
// - AuthCallbackScreen
//
// What is covered:
// - invalid links, the verifying state, link_invalid, a generic failure with retry, the success redirect, en and es
//
// Run with: pnpm --filter @beatly/mobile test -- AuthCallbackScreen
//
// SEE: apps/mobile/src/screens/authCallback/AuthCallbackScreen.tsx

import type { AuthResult } from "@beatly/core";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Text as MockText } from "react-native";

import { i18n } from "../../../src/adapters/i18n.ts";
import { resources } from "../../../src/i18n/resources.ts";
import { AuthCallbackScreen } from "../../../src/screens/authCallback/AuthCallbackScreen.tsx";
import { makeAuth, makeCore, Wrapper } from "../../helpers/core.tsx";

const mockReplace = jest.fn();
let mockParams: Record<string, string | undefined> = {};
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace }),
  useLocalSearchParams: () => mockParams,
  Redirect: ({ href }: { href: string }) => <MockText testID="redirect">{href}</MockText>,
}));

afterEach(async () => {
  mockReplace.mockClear();
  mockParams = {};
  await i18n.changeLanguage("en");
});

const en = resources.en;

async function setup(
  params: Record<string, string | undefined>,
  result?: AuthResult | Promise<AuthResult>,
) {
  mockParams = params;
  const auth = makeAuth();
  if (result !== undefined) auth.confirmEmail.mockImplementation(() => Promise.resolve(result));
  const { core } = makeCore({ auth });
  await render(
    <Wrapper core={core}>
      <AuthCallbackScreen />
    </Wrapper>,
  );
  return auth;
}

const valid = { token_hash: "abc", type: "signup" };

describe("AuthCallbackScreen", () => {
  it("draws invalidLink and never verifies when token_hash is missing", async () => {
    const auth = await setup({ type: "signup" });
    expect(screen.getByText(en.authCallback.invalidLink)).toBeTruthy();
    expect(auth.confirmEmail).not.toHaveBeenCalled();
  });

  it("treats type=recovery as invalid", async () => {
    const auth = await setup({ token_hash: "abc", type: "recovery" });
    expect(screen.getByText(en.authCallback.invalidLink)).toBeTruthy();
    expect(auth.confirmEmail).not.toHaveBeenCalled();
  });

  it("draws the loading state and verifies once for a valid link", async () => {
    const auth = await setup(valid, new Promise<AuthResult>(() => undefined));
    expect(screen.getByLabelText(en.common.loading)).toBeTruthy();
    await waitFor(() => {
      expect(auth.confirmEmail).toHaveBeenCalledTimes(1);
    });
    expect(auth.confirmEmail).toHaveBeenCalledWith({ tokenHash: "abc", type: "signup" });
  });

  it("draws invalidLink on link_invalid and goes back to login", async () => {
    await setup(valid, { kind: "failure", reason: "link_invalid" });
    expect(await screen.findByText(en.authCallback.invalidLink)).toBeTruthy();
    await fireEvent.press(screen.getByText(en.authCallback.backToLogin));
    expect(mockReplace).toHaveBeenCalledWith("/login");
  });

  it("draws the generic error with retry on an unknown failure", async () => {
    const auth = await setup(valid, { kind: "failure", reason: "unknown" });
    expect(await screen.findByText(en.common.error.generic)).toBeTruthy();
    await fireEvent.press(screen.getByText(en.common.retry));
    await waitFor(() => {
      expect(auth.confirmEmail).toHaveBeenCalledTimes(2);
    });
  });

  it("redirects home on success", async () => {
    await setup(valid);
    expect((await screen.findByTestId("redirect")).props.children).toBe("/");
  });

  it("draws in es", async () => {
    await i18n.changeLanguage("es");
    await setup({});
    expect(screen.getByText(resources.es.authCallback.invalidLink)).toBeTruthy();
    expect(screen.getByText(resources.es.authCallback.backToLogin)).toBeTruthy();
  });
});

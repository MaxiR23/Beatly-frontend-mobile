// apps/mobile/test/screens/profile/ProfileScreen.test.tsx
//
// Tests for the profile screen.
//
// Tested:
// - ProfileScreen
//
// What is covered:
// - the name, @username, email and member since in en and es, No name and No username, the role badge
// - the skeleton then the error with retry with no profile, the cached profile drawn at once and kept on a failed refetch
// - the email placeholder, the email read failing, the large avatar's initials, saving from the edit sheet, back
//
// Run with: pnpm --filter @beatly/mobile test -- ProfileScreen
//
// SEE: apps/mobile/src/screens/profile/ProfileScreen.tsx

import type { HttpOutcome, Profile } from "@beatly/core";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { i18n } from "../../../src/adapters/i18n.ts";
import { resources } from "../../../src/i18n/resources.ts";
import { profileQueryKey } from "../../../src/queries/useProfile.ts";
import { ProfileScreen } from "../../../src/screens/profile/ProfileScreen.tsx";
import { createTestQueryClient } from "../../helpers/queryClient.ts";
import { makeAuth, makeCore, profileFixture, successOf, Wrapper } from "../../helpers/core.tsx";

const mockBack = jest.fn();
const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace, canGoBack: () => true }),
}));

afterEach(async () => {
  mockBack.mockClear();
  mockReplace.mockClear();
  await i18n.changeLanguage("en");
});

const en = resources.en;
const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const dated: Profile = { ...profileFixture, created_at: "2026-03-15T12:00:00Z" };

async function setup(
  options: Parameters<typeof makeCore>[0] = {},
  client = createTestQueryClient(),
) {
  const ctx = makeCore(options);
  await render(
    <Wrapper core={ctx.core} client={client}>
      <SafeAreaProvider initialMetrics={metrics}>
        <ProfileScreen />
      </SafeAreaProvider>
    </Wrapper>,
  );
  return ctx;
}

const profileOf = (profile: Profile) => () => Promise.resolve(successOf(profile));
const failing = (): Promise<HttpOutcome<Profile>> =>
  Promise.resolve({ kind: "api_failure", reason: "upstream_error" });

describe("ProfileScreen", () => {
  it("draws the name, @username, the email and member since", async () => {
    await setup({ getMyProfile: profileOf(dated) });
    expect(await screen.findByText("Maxi")).toBeTruthy();
    expect(screen.getByText("@maxi_23")).toBeTruthy();
    expect(await screen.findByText("listener@example.com")).toBeTruthy();
    expect(screen.getByText("March 2026")).toBeTruthy();
  });

  it("draws member since in Spanish", async () => {
    await i18n.changeLanguage("es");
    await setup({ getMyProfile: profileOf(dated) });
    expect(await screen.findByText("marzo de 2026")).toBeTruthy();
  });

  it("draws No name and No username, never an empty line", async () => {
    await setup({ getMyProfile: profileOf({ ...dated, display_name: null, username: null }) });
    expect(await screen.findByText(en.common.account.noName)).toBeTruthy();
    expect(screen.getByText(en.profile.noUsername)).toBeTruthy();
    expect(screen.queryByText("null")).toBeNull();
  });

  it.each(["admin", "developer", "tester"] as const)("draws the badge for %s", async (role) => {
    await setup({ getMyProfile: profileOf({ ...dated, role }) });
    const badge = await screen.findByTestId("profile-role");
    expect(badge).toHaveTextContent(en.profile.roles[role]);
  });

  it("draws no badge for user", async () => {
    await setup({ getMyProfile: profileOf(dated) });
    await screen.findByText("Maxi");
    expect(screen.queryByTestId("profile-role")).toBeNull();
  });

  it("omits the email row when the session has no email", async () => {
    await setup({
      getMyProfile: profileOf(dated),
      auth: makeAuth({ getEmail: jest.fn(() => Promise.resolve(null)) }),
    });
    expect(await screen.findByText("Maxi")).toBeTruthy();
    await waitFor(() => {
      expect(screen.queryByTestId("profile-email-skeleton")).toBeNull();
    });
    expect(screen.queryByText(en.profile.email)).toBeNull();
    expect(screen.getByText(en.profile.memberSince)).toBeTruthy();
  });

  it("draws the profile skeleton while there is no profile, then the generic error with retry", async () => {
    let fail: () => void = () => undefined;
    const getMyProfile = jest.fn<() => Promise<HttpOutcome<Profile>>>(
      () =>
        new Promise((resolve) => {
          fail = () => {
            resolve({ kind: "api_failure", reason: "upstream_error" });
          };
        }),
    );
    const ctx = await setup({ getMyProfile });
    expect(screen.getByTestId("profile-skeleton")).toBeTruthy();
    await act(async () => {
      fail();
      await Promise.resolve();
    });
    expect(await screen.findByText(en.common.error.generic)).toBeTruthy();
    getMyProfile.mockImplementation(profileOf(dated));
    await fireEvent.press(screen.getByRole("button", { name: en.common.retry }));
    expect(await screen.findByText("Maxi")).toBeTruthy();
    expect(ctx.getMyProfile).toHaveBeenCalledTimes(2);
  });

  it("draws the cached profile at once, with no skeleton", async () => {
    const client = createTestQueryClient();
    client.setQueryData(profileQueryKey, successOf(dated));
    await setup({ getMyProfile: profileOf(dated) }, client);
    expect(screen.getByText("Maxi")).toBeTruthy();
    expect(screen.queryByTestId("profile-skeleton")).toBeNull();
  });

  it("keeps the cached profile when its background refetch fails", async () => {
    const client = createTestQueryClient();
    client.setQueryData(profileQueryKey, successOf(dated));
    const ctx = await setup({ getMyProfile: failing }, client);
    await waitFor(() => {
      expect(ctx.getMyProfile).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText("Maxi")).toBeTruthy();
    expect(screen.queryByText(en.common.error.generic)).toBeNull();
  });

  it("draws a placeholder for the email until the session is read", async () => {
    await setup({
      getMyProfile: profileOf(dated),
      auth: makeAuth({ getEmail: jest.fn(() => new Promise<string | null>(() => undefined)) }),
    });
    expect(await screen.findByText("Maxi")).toBeTruthy();
    expect(screen.getByTestId("profile-email-skeleton")).toBeTruthy();
    await screen.unmount();
    await setup({ getMyProfile: profileOf(dated) });
    expect(await screen.findByText("listener@example.com")).toBeTruthy();
    expect(screen.queryByTestId("profile-email-skeleton")).toBeNull();
  });

  it("draws the error with retry when the session cannot be read", async () => {
    const getEmail = jest.fn<() => Promise<string | null>>(() =>
      Promise.reject(new Error("store")),
    );
    await setup({ getMyProfile: profileOf(dated), auth: makeAuth({ getEmail }) });
    expect(await screen.findByText(en.common.error.generic)).toBeTruthy();
    getEmail.mockImplementation(() => Promise.resolve("listener@example.com"));
    await fireEvent.press(screen.getByRole("button", { name: en.common.retry }));
    expect(await screen.findByText("listener@example.com")).toBeTruthy();
    expect(getEmail).toHaveBeenCalledTimes(2);
  });

  it("draws the large avatar with the header's initials, from the username", async () => {
    await setup({ getMyProfile: profileOf({ ...dated, username: "zed_99" }) });
    expect(await screen.findByText("Maxi")).toBeTruthy();
    expect(screen.getByText("Z")).toBeTruthy();
    expect(screen.queryByText("M")).toBeNull();
  });

  it("shows the new name after saving from the edit sheet", async () => {
    const renamed = { ...dated, display_name: "New" };
    let calls = 0;
    const ctx = await setup({
      getMyProfile: () => Promise.resolve(successOf(++calls === 1 ? dated : renamed)),
      updateMyProfile: profileOf(renamed),
    });
    await fireEvent.press(await screen.findByRole("button", { name: en.profile.editProfile }));
    await fireEvent.changeText(screen.getByLabelText(en.profile.edit.name), "New");
    await fireEvent.press(screen.getByRole("button", { name: en.profile.edit.submit }));
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: en.profile.edit.submit })).toBeNull();
    });
    expect(screen.getByText("New")).toBeTruthy();
    expect(ctx.updateMyProfile).toHaveBeenCalledWith({ display_name: "New" });
  });

  it("goes back", async () => {
    await setup({ getMyProfile: profileOf(dated) });
    await fireEvent.press(screen.getByRole("button", { name: en.profile.back }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});

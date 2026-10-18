// apps/mobile/test/screens/account/AccountButton.test.tsx
//
// Tests for the account button and its sheet.
//
// Tested:
// - AccountButton
//
// What is covered:
// - the profile row first, then report a problem and My reports above log out
// - the row from the cache with no new request, No name, the skeleton row while the profile loads or fails, always opening the profile
// - the report form and My reports opening in place of the account sheet
// - All reports below My reports for a developer or an admin, never for a user or a tester, nor while the profile loads or fails, opening its screen and closing the sheet
//
// Run with: pnpm --filter @beatly/mobile test -- AccountButton
//
// SEE: apps/mobile/src/screens/account/AccountButton.tsx

import type { HttpOutcome, Profile } from "@beatly/core";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { resources } from "../../../src/i18n/resources.ts";
import { AccountButton } from "../../../src/screens/account/AccountButton.tsx";
import { makeCore, profileFixture, successOf, Wrapper } from "../../helpers/core.tsx";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));

afterEach(() => {
  mockPush.mockClear();
});

const en = resources.en;
const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

async function setup(options: Parameters<typeof makeCore>[0] = {}) {
  const ctx = makeCore(options);
  await render(
    <Wrapper core={ctx.core}>
      <SafeAreaProvider initialMetrics={metrics}>
        <AccountButton />
      </SafeAreaProvider>
    </Wrapper>,
  );
  await fireEvent.press(screen.getByRole("button", { name: en.common.account.open }));
  return ctx;
}

const profileLabel = (name: string) => en.common.account.profileRow.replace("{{name}}", name);
const pending = () => new Promise<HttpOutcome<Profile>>(() => undefined);
const failing = (): Promise<HttpOutcome<Profile>> =>
  Promise.resolve({ kind: "api_failure", reason: "upstream_error" });

describe("the account sheet", () => {
  it("offers the profile row above Report a problem, My reports and Log out", async () => {
    await setup();
    const row = await screen.findByRole("button", { name: profileLabel("Maxi") });
    const names = screen.getAllByRole("button").map((node) => {
      const label: unknown = node.props.accessibilityLabel;
      return typeof label === "string" ? label : "";
    });
    expect(row).toBeTruthy();
    expect(names.indexOf(profileLabel("Maxi"))).toBeLessThan(
      names.indexOf(en.common.account.report),
    );
  });

  it("draws No name on the row when the profile has none", async () => {
    await setup({
      getMyProfile: () => Promise.resolve(successOf({ ...profileFixture, display_name: null })),
    });
    expect(
      await screen.findByRole("button", { name: profileLabel(en.common.account.noName) }),
    ).toBeTruthy();
    expect(screen.getByText(en.common.account.noName)).toBeTruthy();
  });

  it("opens the profile screen from the row and closes the sheet", async () => {
    await setup();
    await fireEvent.press(await screen.findByRole("button", { name: profileLabel("Maxi") }));
    expect(mockPush).toHaveBeenCalledWith("/profile");
    expect(screen.queryByRole("button", { name: en.common.account.logout })).toBeNull();
  });

  it("draws the skeleton row while the profile loads and opens the profile from it", async () => {
    await setup({ getMyProfile: pending });
    expect(screen.getByTestId("avatar-row-skeleton")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: en.common.account.viewProfile }));
    expect(mockPush).toHaveBeenCalledWith("/profile");
  });

  it("draws the skeleton row after the profile fails, opens the profile from it and keeps log out reachable", async () => {
    const ctx = await setup({ getMyProfile: failing });
    await waitFor(() => {
      expect(ctx.getMyProfile).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByTestId("avatar-row-skeleton")).toBeTruthy();
    expect(screen.getByRole("button", { name: en.common.account.logout })).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: en.common.account.viewProfile }));
    expect(mockPush).toHaveBeenCalledWith("/profile");
  });

  it("draws the row from the cached profile when the sheet opens, with no new request", async () => {
    const ctx = makeCore();
    await render(
      <Wrapper core={ctx.core}>
        <SafeAreaProvider initialMetrics={metrics}>
          <AccountButton />
        </SafeAreaProvider>
      </Wrapper>,
    );
    await waitFor(() => {
      expect(ctx.getMyProfile).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: en.common.account.open })).toBeTruthy();
    });
    await fireEvent.press(screen.getByRole("button", { name: en.common.account.open }));
    expect(screen.getByRole("button", { name: profileLabel("Maxi") })).toBeTruthy();
    expect(screen.queryByTestId("avatar-row-skeleton")).toBeNull();
    expect(ctx.getMyProfile).toHaveBeenCalledTimes(1);
  });

  it("offers Report a problem and My reports above Log out", async () => {
    await setup();
    const names = screen.getAllByRole("button").map((node) => {
      const label: unknown = node.props.accessibilityLabel;
      return typeof label === "string" ? label : "";
    });
    const report = names.indexOf(en.common.account.report);
    const mine = names.indexOf(en.common.account.myReports);
    const logout = names.indexOf(en.common.account.logout);
    expect(report).toBeGreaterThanOrEqual(0);
    expect(mine).toBeGreaterThan(report);
    expect(logout).toBeGreaterThan(mine);
  });

  it("opens the empty report form in place of the account sheet", async () => {
    await setup();
    await fireEvent.press(screen.getByRole("button", { name: en.common.account.report }));
    expect(screen.getByText(en.bugReports.form.title)).toBeTruthy();
    expect(screen.queryByText(/^About:/)).toBeNull();
    expect(screen.queryByRole("button", { name: en.common.account.logout })).toBeNull();
  });

  it.each(["developer", "admin"] as const)(
    "offers All reports below My reports for a %s",
    async (role) => {
      await setup({
        getMyProfile: () => Promise.resolve(successOf({ ...profileFixture, role })),
      });
      await screen.findByRole("button", { name: profileLabel("Maxi") });
      const names = screen.getAllByRole("button").map((node) => {
        const label: unknown = node.props.accessibilityLabel;
        return typeof label === "string" ? label : "";
      });
      const mine = names.indexOf(en.common.account.myReports);
      const all = names.indexOf(en.common.account.allReports);
      expect(all).toBeGreaterThan(mine);
      expect(names.indexOf(en.common.account.logout)).toBeGreaterThan(all);
    },
  );

  it.each(["user", "tester"] as const)("never offers All reports to a %s", async (role) => {
    await setup({ getMyProfile: () => Promise.resolve(successOf({ ...profileFixture, role })) });
    await screen.findByRole("button", { name: profileLabel("Maxi") });
    expect(screen.queryByTestId("account-all-reports")).toBeNull();
  });

  it("does not offer All reports while the profile loads or after it fails", async () => {
    await setup({ getMyProfile: pending });
    expect(screen.queryByTestId("account-all-reports")).toBeNull();
    await screen.unmount();
    const ctx = await setup({ getMyProfile: failing });
    await waitFor(() => {
      expect(ctx.getMyProfile).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByTestId("account-all-reports")).toBeNull();
  });

  it("opens the All reports screen from the entry and closes the sheet", async () => {
    await setup({
      getMyProfile: () => Promise.resolve(successOf({ ...profileFixture, role: "admin" })),
    });
    await fireEvent.press(await screen.findByTestId("account-all-reports"));
    expect(mockPush).toHaveBeenCalledWith("/bug-reports");
    expect(screen.queryByRole("button", { name: en.common.account.logout })).toBeNull();
  });

  it("opens My reports in place of the account sheet", async () => {
    const ctx = await setup();
    await fireEvent.press(screen.getByRole("button", { name: en.common.account.myReports }));
    expect(screen.getByText(en.bugReports.list.title)).toBeTruthy();
    expect(ctx.listMyBugReports).toHaveBeenCalledTimes(1);
  });
});

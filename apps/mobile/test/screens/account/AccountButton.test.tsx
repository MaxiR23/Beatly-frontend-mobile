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
// - the sheet attached to the bottom and side edges, its content 34 above the bottom edge inside a native tab (the window's inset, not the tab's 83)
// - the account sheet drawn through its close, the report form opening only once it has closed
//
// Run with: pnpm --filter @beatly/mobile test -- AccountButton
//
// SEE: apps/mobile/src/screens/account/AccountButton.tsx

import type { HttpOutcome, Profile } from "@beatly/core";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { resources } from "../../../src/i18n/resources.ts";
import { AccountButton } from "../../../src/screens/account/AccountButton.tsx";
import { makeCore, profileFixture, successOf, Wrapper } from "../../helpers/core.tsx";
import { expectSheetOverWindow, Insets } from "../../helpers/insets.tsx";
import { holdSheetMotion } from "../../helpers/sheetMotion.ts";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));

afterEach(() => {
  mockPush.mockClear();
});

const en = resources.en;
async function setup(options: Parameters<typeof makeCore>[0] = {}, tab = false) {
  const ctx = makeCore(options);
  await render(
    <Wrapper core={ctx.core}>
      <Insets tab={tab}>
        <AccountButton />
      </Insets>
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
  it("attaches the sheet to the bottom and side edges with its content the window's bottom inset above the edge inside a native tab", async () => {
    await setup({}, true);
    expectSheetOverWindow({ top: false });
  });

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
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: en.common.account.logout })).toBeNull();
    });
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
        <Insets>
          <AccountButton />
        </Insets>
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
    expect(await screen.findByText(en.bugReports.form.title)).toBeTruthy();
    expect(screen.queryByText(/^About:/)).toBeNull();
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: en.common.account.logout })).toBeNull();
    });
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
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: en.common.account.logout })).toBeNull();
    });
  });

  it("opens the report form only after the account sheet has closed", async () => {
    const motionHold = holdSheetMotion();
    try {
      await setup();
      await motionHold.finishAll();
      await fireEvent.press(screen.getByRole("button", { name: en.common.account.report }));
      expect(screen.getByRole("button", { name: en.common.account.logout })).toBeTruthy();
      expect(screen.queryByLabelText(en.bugReports.form.description)).toBeNull();
      await motionHold.finishAll();
      expect(await screen.findByLabelText(en.bugReports.form.description)).toBeTruthy();
      expect(screen.queryByRole("button", { name: en.common.account.logout })).toBeNull();
    } finally {
      motionHold.restore();
    }
  });

  it("opens My reports in place of the account sheet", async () => {
    const ctx = await setup();
    await fireEvent.press(screen.getByRole("button", { name: en.common.account.myReports }));
    expect(await screen.findByText(en.bugReports.list.title)).toBeTruthy();
    await waitFor(() => {
      expect(ctx.listMyBugReports).toHaveBeenCalledTimes(1);
    });
  });
});

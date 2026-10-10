// apps/mobile/test/screens/account/AccountButton.test.tsx
//
// Tests for the account button and its sheet.
//
// Tested:
// - AccountButton
//
// What is covered:
// - report a problem and My reports offered above log out
// - the report form and My reports opening in place of the account sheet
//
// Run with: pnpm --filter @beatly/mobile test -- AccountButton
//
// SEE: apps/mobile/src/screens/account/AccountButton.tsx

import { describe, expect, it } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { resources } from "../../../src/i18n/resources.ts";
import { AccountButton } from "../../../src/screens/account/AccountButton.tsx";
import { makeCore, Wrapper } from "../../helpers/core.tsx";

const en = resources.en;
const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

async function setup() {
  const ctx = makeCore();
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

describe("the account sheet", () => {
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

  it("opens My reports in place of the account sheet", async () => {
    const ctx = await setup();
    await fireEvent.press(screen.getByRole("button", { name: en.common.account.myReports }));
    expect(screen.getByText(en.bugReports.list.title)).toBeTruthy();
    expect(ctx.listMyBugReports).toHaveBeenCalledTimes(1);
  });
});

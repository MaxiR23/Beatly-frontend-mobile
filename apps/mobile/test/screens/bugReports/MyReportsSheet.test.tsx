// apps/mobile/test/screens/bugReports/MyReportsSheet.test.tsx
//
// Tests for the My reports sheet.
//
// Tested:
// - MyReportsSheet
//
// What is covered:
// - each report with its category, date, track mark, excerpt and status
// - loading the next page at the end of the list
// - the expected empty state, and the error with retry that recovers
// - the sheet attached to the bottom and side edges, its content 34 above the bottom edge inside a native tab (the window's inset, not the tab's 83)
//
// Run with: pnpm --filter @beatly/mobile test -- MyReportsSheet
//
// SEE: apps/mobile/src/screens/bugReports/MyReportsSheet.tsx

import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, within } from "@testing-library/react-native";

import { resources } from "../../../src/i18n/resources.ts";
import { MyReportsSheet } from "../../../src/screens/bugReports/MyReportsSheet.tsx";
import {
  bugReportFixture,
  makeCore,
  pageOf,
  trackBugReportFixture,
  Wrapper,
} from "../../helpers/core.tsx";
import { expectSheetOverWindow, Insets } from "../../helpers/insets.tsx";

const en = resources.en;
afterEach(() => {
  jest.useRealTimers();
});

async function setup(options: Parameters<typeof makeCore>[0] = {}, tab = false) {
  const ctx = makeCore(options);
  await render(
    <Wrapper core={ctx.core}>
      <Insets tab={tab}>
        <MyReportsSheet visible onClosed={jest.fn()} onClose={jest.fn()} />
      </Insets>
    </Wrapper>,
  );
  return ctx;
}

describe("the My reports sheet", () => {
  it("attaches the sheet to the bottom and side edges with its content the window's bottom inset above the edge inside a native tab", async () => {
    await setup({}, true);
    expectSheetOverWindow({ top: true });
  });

  it("draws each report with its category, date, track mark, excerpt and status", async () => {
    await setup({
      listMyBugReports: () => Promise.resolve(pageOf([bugReportFixture, trackBugReportFixture])),
    });
    const first = await screen.findByTestId("report-r1");
    const date = new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
      new Date(Date.UTC(2026, 9, 1, 10, 0, 0)),
    );
    expect(within(first).getByText(en.bugReports.categories.playback)).toBeTruthy();
    expect(within(first).getByText(new RegExp(date))).toBeTruthy();
    expect(within(first).getByText(new RegExp(bugReportFixture.description))).toBeTruthy();
    expect(within(screen.getByTestId("report-status-r1")).getByText("Open")).toBeTruthy();

    const second = screen.getByTestId("report-r2");
    expect(within(second).getByText(en.bugReports.categories.ui)).toBeTruthy();
    expect(within(second).getByText(new RegExp(en.bugReports.list.entity.track))).toBeTruthy();
    expect(within(screen.getByTestId("report-status-r2")).getByText("Closed")).toBeTruthy();
  });

  it("loads the next page at the end of the list", async () => {
    const ctx = await setup({
      listMyBugReports: (cursor) =>
        Promise.resolve(
          cursor === null
            ? pageOf([bugReportFixture], { has_more: true, next_cursor: "c1" })
            : pageOf([trackBugReportFixture]),
        ),
    });
    await screen.findByTestId("report-r1");
    await fireEvent(screen.getByTestId("reports-list"), "onEndReached");
    expect(ctx.listMyBugReports).toHaveBeenLastCalledWith("c1");
    expect(await screen.findByTestId("report-r2")).toBeTruthy();
  });

  it("draws the empty state on an empty first page", async () => {
    await setup();
    expect(await screen.findByText(en.bugReports.list.empty)).toBeTruthy();
    expect(screen.queryByText(en.common.error.generic)).toBeNull();
    expect(screen.queryByRole("button", { name: en.common.retry })).toBeNull();
  });

  it("draws the error with retry and recovers", async () => {
    const listMyBugReports = jest
      .fn<ReturnType<typeof makeCore>["listMyBugReports"]>()
      .mockResolvedValueOnce({ kind: "transport_failure", cause: "network" })
      .mockResolvedValue(pageOf([bugReportFixture]));
    const ctx = await setup({ listMyBugReports });
    expect(await screen.findByText(en.common.error.generic)).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: en.common.retry }));
    expect(await screen.findByTestId("report-r1")).toBeTruthy();
    expect(ctx.listMyBugReports).toHaveBeenCalledTimes(2);
  });
});

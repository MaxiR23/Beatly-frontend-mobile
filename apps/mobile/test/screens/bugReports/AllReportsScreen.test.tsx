// apps/mobile/test/screens/bugReports/AllReportsScreen.test.tsx
//
// Tests for the All reports screen.
//
// Tested:
// - AllReportsScreen
//
// What is covered:
// - each report with its reporter, category, date, excerpt and status, in the order received
// - the filters asking for all, open and closed from the first page, with no filtering on the client
// - loading the next page at the end of the list
// - the expected empty state of each filter, the error with retry that recovers, and not allowed on forbidden
// - opening the full report from a row
// - the report detail drawn until its close ends
//
// Run with: pnpm --filter @beatly/mobile test -- AllReportsScreen
//
// SEE: apps/mobile/src/screens/bugReports/AllReportsScreen.tsx

import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, within } from "@testing-library/react-native";

import { resources } from "../../../src/i18n/resources.ts";
import { AllReportsScreen } from "../../../src/screens/bugReports/AllReportsScreen.tsx";
import {
  makeCore,
  pageOf,
  triageAnonymousFixture,
  triageReportFixture,
  triageUsernameFixture,
  Wrapper,
} from "../../helpers/core.tsx";
import { Insets } from "../../helpers/insets.tsx";
import { holdSheetMotion } from "../../helpers/sheetMotion.ts";

const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack, canGoBack: () => true, replace: jest.fn(), push: jest.fn() }),
}));

const en = resources.en;
afterEach(() => {
  jest.useRealTimers();
});

async function setup(options: Parameters<typeof makeCore>[0] = {}) {
  const ctx = makeCore(options);
  await render(
    <Wrapper core={ctx.core}>
      <Insets>
        <AllReportsScreen />
      </Insets>
    </Wrapper>,
  );
  return ctx;
}

describe("the All reports screen", () => {
  it("draws each report with its reporter, category, date, excerpt and status, in the order received", async () => {
    await setup({
      listBugReports: () =>
        Promise.resolve(
          pageOf([triageUsernameFixture, triageReportFixture, triageAnonymousFixture]),
        ),
    });
    const first = await screen.findByTestId("triage-r3");
    const date = new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
      new Date(Date.UTC(2026, 9, 1, 10, 0, 0)),
    );
    expect(within(first).getByText(en.bugReports.categories.ui)).toBeTruthy();
    expect(within(first).getByText(new RegExp(`^@lu · ${date} · The cover is cut`))).toBeTruthy();
    expect(within(screen.getByTestId("triage-status-r3")).getByText("Closed")).toBeTruthy();
    expect(
      within(screen.getByTestId("triage-r1")).getByText(
        new RegExp(`^Maxi · ${date} · ${triageReportFixture.description}`),
      ),
    ).toBeTruthy();
    expect(within(screen.getByTestId("triage-status-r1")).getByText("Open")).toBeTruthy();
    expect(
      within(screen.getByTestId("triage-r4")).getByText(
        new RegExp(`^${en.bugReports.triage.unknownReporter} · `),
      ),
    ).toBeTruthy();
    const ids = screen.getAllByTestId(/^triage-r\d$/).map((node) => String(node.props.testID));
    expect(ids).toEqual(["triage-r3", "triage-r1", "triage-r4"]);
  });

  it("asks for all, open and closed from the first page", async () => {
    const ctx = await setup({
      listBugReports: () => Promise.resolve(pageOf([triageReportFixture])),
    });
    await screen.findByTestId("triage-r1");
    await fireEvent.press(screen.getByRole("button", { name: en.bugReports.triage.filters.open }));
    await screen.findByTestId("triage-r1");
    await fireEvent.press(
      screen.getByRole("button", { name: en.bugReports.triage.filters.closed }),
    );
    await screen.findByTestId("triage-r1");
    expect(ctx.listBugReports.mock.calls).toEqual([
      [null, null],
      ["open", null],
      ["closed", null],
    ]);
  });

  it("draws a closed report returned for the open filter as is", async () => {
    await setup({
      listBugReports: (status) =>
        Promise.resolve(pageOf(status === "open" ? [triageUsernameFixture] : [])),
    });
    await screen.findByText(en.bugReports.triage.empty.all);
    await fireEvent.press(screen.getByRole("button", { name: en.bugReports.triage.filters.open }));
    const badge = await screen.findByTestId("triage-status-r3");
    expect(within(badge).getByText("Closed")).toBeTruthy();
  });

  it("loads the next page at the end of the list", async () => {
    const ctx = await setup({
      listBugReports: (_status, cursor) =>
        Promise.resolve(
          cursor === null
            ? pageOf([triageReportFixture], { has_more: true, next_cursor: "c1" })
            : pageOf([triageUsernameFixture]),
        ),
    });
    await screen.findByTestId("triage-r1");
    await fireEvent(screen.getByTestId("all-reports-list"), "onEndReached");
    expect(ctx.listBugReports).toHaveBeenLastCalledWith(null, "c1");
    expect(await screen.findByTestId("triage-r3")).toBeTruthy();
  });

  it.each(["all", "open", "closed"] as const)(
    "draws the %s empty state on an empty first page",
    async (filter) => {
      await setup();
      await screen.findByText(en.bugReports.triage.empty.all);
      if (filter !== "all") {
        await fireEvent.press(
          screen.getByRole("button", { name: en.bugReports.triage.filters[filter] }),
        );
      }
      expect(await screen.findByText(en.bugReports.triage.empty[filter])).toBeTruthy();
      expect(screen.queryByText(en.common.error.generic)).toBeNull();
      expect(screen.queryByRole("button", { name: en.common.retry })).toBeNull();
    },
  );

  it("draws the error with retry on a transport failure and recovers", async () => {
    const listBugReports = jest
      .fn<ReturnType<typeof makeCore>["listBugReports"]>()
      .mockResolvedValueOnce({ kind: "transport_failure", cause: "network" })
      .mockResolvedValue(pageOf([triageReportFixture]));
    const ctx = await setup({ listBugReports });
    expect(await screen.findByText(en.common.error.generic)).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: en.common.retry }));
    expect(await screen.findByTestId("triage-r1")).toBeTruthy();
    expect(ctx.listBugReports).toHaveBeenCalledTimes(2);
  });

  it("draws the error with retry on upstream_error", async () => {
    await setup({
      listBugReports: () => Promise.resolve({ kind: "api_failure", reason: "upstream_error" }),
    });
    expect(await screen.findByText(en.common.error.generic)).toBeTruthy();
    expect(screen.getByRole("button", { name: en.common.retry })).toBeTruthy();
  });

  it("draws not allowed with no retry on forbidden", async () => {
    await setup({
      listBugReports: () => Promise.resolve({ kind: "api_failure", reason: "forbidden" }),
    });
    expect(await screen.findByText(en.bugReports.triage.forbidden)).toBeTruthy();
    expect(screen.queryByText(en.common.error.generic)).toBeNull();
    expect(screen.queryByRole("button", { name: en.common.retry })).toBeNull();
  });

  it("opens the full report when a row is pressed", async () => {
    await setup({ listBugReports: () => Promise.resolve(pageOf([triageReportFixture])) });
    await fireEvent.press(await screen.findByTestId("triage-r1"));
    expect(await screen.findByTestId("report-detail-status")).toBeTruthy();
    expect(screen.getByText(en.bugReports.triage.detail.title)).toBeTruthy();
  });

  it("keeps the report detail drawn until its close ends", async () => {
    const motionHold = holdSheetMotion();
    try {
      await setup({ listBugReports: () => Promise.resolve(pageOf([triageReportFixture])) });
      await fireEvent.press(await screen.findByTestId("triage-r1"));
      await motionHold.finishAll();
      await fireEvent.press(
        screen.getByRole("button", { name: en.bugReports.triage.detail.dismiss }),
      );
      expect(screen.getByTestId("report-detail-status")).toBeTruthy();
      await motionHold.finishAll();
      expect(screen.queryByTestId("report-detail-status")).toBeNull();
    } finally {
      motionHold.restore();
    }
  });

  it("goes back from the header", async () => {
    await setup();
    await fireEvent.press(screen.getByRole("button", { name: en.bugReports.triage.back }));
    expect(mockBack).toHaveBeenCalled();
  });
});

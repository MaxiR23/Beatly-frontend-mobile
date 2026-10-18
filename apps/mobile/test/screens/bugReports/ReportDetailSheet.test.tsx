// apps/mobile/test/screens/bugReports/ReportDetailSheet.test.tsx
//
// Tests for the report detail sheet.
//
// Tested:
// - ReportDetailSheet
//
// What is covered:
// - the full report: description, category, reporter, linked entity and date, and no entity line for a report about nothing
// - closing and reopening with the badge and the action changing at once
// - the rollback and the inline line on a generic failure, forbidden and report_not_found
//
// Run with: pnpm --filter @beatly/mobile test -- ReportDetailSheet
//
// SEE: apps/mobile/src/screens/bugReports/ReportDetailSheet.tsx

import type { BugReport, HttpOutcome } from "@beatly/core";
import { describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { resources } from "../../../src/i18n/resources.ts";
import { ReportDetailSheet } from "../../../src/screens/bugReports/ReportDetailSheet.tsx";
import {
  bugReportFixture,
  makeCore,
  triageReportFixture,
  triageUsernameFixture,
  Wrapper,
} from "../../helpers/core.tsx";

const en = resources.en;
const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

async function setup(
  report: Parameters<typeof ReportDetailSheet>[0]["report"],
  options: Parameters<typeof makeCore>[0] = {},
) {
  const ctx = makeCore(options);
  await render(
    <Wrapper core={ctx.core}>
      <SafeAreaProvider initialMetrics={metrics}>
        <ReportDetailSheet report={report} onClose={jest.fn()} />
      </SafeAreaProvider>
    </Wrapper>,
  );
  return ctx;
}

const status = () => within(screen.getByTestId("report-detail-status"));
const closed = (): HttpOutcome<BugReport> => ({
  kind: "success",
  maxAgeSeconds: 0,
  data: { ...bugReportFixture, status: "closed" },
});

describe("the report detail sheet", () => {
  it("draws the description, category, reporter, linked entity and date", async () => {
    await setup(triageUsernameFixture);
    const date = new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
      new Date(Date.UTC(2026, 9, 1, 10, 0, 0)),
    );
    expect(screen.getByText(triageUsernameFixture.description)).toBeTruthy();
    expect(screen.getByText(en.bugReports.categories.ui)).toBeTruthy();
    expect(screen.getByText("@lu")).toBeTruthy();
    expect(screen.getByText(`${en.bugReports.list.entity.track} · t1`)).toBeTruthy();
    expect(screen.getByText(date)).toBeTruthy();
    expect(status().getByText("Closed")).toBeTruthy();
  });

  it("draws no entity line for a report about nothing", async () => {
    await setup(triageReportFixture);
    expect(screen.getByText("Maxi")).toBeTruthy();
    expect(screen.queryByText(en.bugReports.triage.detail.entity)).toBeNull();
  });

  it("closes a report: the badge and the action change at once and stay after success", async () => {
    let release: (value: HttpOutcome<BugReport>) => void = () => undefined;
    const ctx = await setup(triageReportFixture, {
      updateBugReportStatus: () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    });
    await fireEvent.press(screen.getByRole("button", { name: en.bugReports.triage.detail.close }));
    await waitFor(() => {
      expect(status().getByText("Closed")).toBeTruthy();
    });
    expect(ctx.updateBugReportStatus).toHaveBeenCalledWith("r1", "closed");
    await act(() => {
      release(closed());
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: en.bugReports.triage.detail.reopen })).toBeTruthy();
    });
    expect(status().getByText("Closed")).toBeTruthy();
  });

  it("reopens a closed report", async () => {
    const ctx = await setup(triageUsernameFixture, {
      updateBugReportStatus: () =>
        Promise.resolve({
          kind: "success",
          maxAgeSeconds: 0,
          data: { ...bugReportFixture, status: "open" },
        }),
    });
    await fireEvent.press(screen.getByRole("button", { name: en.bugReports.triage.detail.reopen }));
    await waitFor(() => {
      expect(status().getByText("Open")).toBeTruthy();
    });
    expect(ctx.updateBugReportStatus).toHaveBeenCalledWith("r3", "open");
  });

  it.each([
    ["upstream_error", { kind: "api_failure", reason: "upstream_error" }],
    ["a transport failure", { kind: "transport_failure", cause: "network" }],
  ] as [string, HttpOutcome<BugReport>][])(
    "rolls back the badge and shows the generic error on %s",
    async (_name, outcome) => {
      await setup(triageReportFixture, { updateBugReportStatus: () => Promise.resolve(outcome) });
      await fireEvent.press(
        screen.getByRole("button", { name: en.bugReports.triage.detail.close }),
      );
      expect(await screen.findByText(en.common.error.generic)).toBeTruthy();
      expect(status().getByText("Open")).toBeTruthy();
    },
  );

  it("rolls back and says not allowed on forbidden", async () => {
    await setup(triageReportFixture, {
      updateBugReportStatus: () => Promise.resolve({ kind: "api_failure", reason: "forbidden" }),
    });
    await fireEvent.press(screen.getByRole("button", { name: en.bugReports.triage.detail.close }));
    expect(await screen.findByText(en.bugReports.triage.detail.forbidden)).toBeTruthy();
    expect(status().getByText("Open")).toBeTruthy();
  });

  it("rolls back and says the report no longer exists on report_not_found", async () => {
    await setup(triageReportFixture, {
      updateBugReportStatus: () =>
        Promise.resolve({ kind: "api_failure", reason: "report_not_found" }),
    });
    await fireEvent.press(screen.getByRole("button", { name: en.bugReports.triage.detail.close }));
    expect(await screen.findByText(en.bugReports.triage.detail.notFound)).toBeTruthy();
    expect(status().getByText("Open")).toBeTruthy();
  });

  it("rolls back to the last confirmed status when a second change fails", async () => {
    const outcomes: HttpOutcome<BugReport>[] = [
      closed(),
      { kind: "api_failure", reason: "upstream_error" },
    ];
    await setup(triageReportFixture, {
      updateBugReportStatus: () => Promise.resolve(outcomes.shift() ?? closed()),
    });
    await fireEvent.press(screen.getByRole("button", { name: en.bugReports.triage.detail.close }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: en.bugReports.triage.detail.reopen })).toBeTruthy();
    });
    await fireEvent.press(screen.getByRole("button", { name: en.bugReports.triage.detail.reopen }));
    expect(await screen.findByText(en.common.error.generic)).toBeTruthy();
    expect(status().getByText("Closed")).toBeTruthy();
    expect(screen.getByRole("button", { name: en.bugReports.triage.detail.reopen })).toBeTruthy();
  });
});

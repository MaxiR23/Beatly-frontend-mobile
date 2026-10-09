// apps/mobile/test/screens/bugReports/ReportProblemSheet.test.tsx
//
// Tests for the report form sheet.
//
// Tested:
// - ReportProblemSheet
//
// What is covered:
// - Send disabled until a category and a valid description, and invalid input never reaching the service
// - the counter only near the limit
// - the chosen category and the trimmed description sent, with and without a track
// - a busy Send, the generic error with the input kept, the confirmation then closing
// - the labels in Spanish
//
// Run with: pnpm --filter @beatly/mobile test -- ReportProblemSheet
//
// SEE: apps/mobile/src/screens/bugReports/ReportProblemSheet.tsx

import type { BugReport, HttpOutcome } from "@beatly/core";
import { motion } from "@beatly/ui";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { i18n } from "../../../src/adapters/i18n.ts";
import { resources } from "../../../src/i18n/resources.ts";
import { ReportProblemSheet } from "../../../src/screens/bugReports/ReportProblemSheet.tsx";
import { bugReportFixture, makeCore, stateFlag, Wrapper } from "../../helpers/core.tsx";

const en = resources.en;
const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

afterEach(async () => {
  jest.useRealTimers();
  await i18n.changeLanguage("en");
});

async function setup(
  options: Parameters<typeof makeCore>[0] = {},
  track: { id: string; title: string } | null = null,
) {
  const ctx = makeCore(options);
  const onClose = jest.fn<() => void>();
  await render(
    <Wrapper core={ctx.core}>
      <SafeAreaProvider initialMetrics={metrics}>
        <ReportProblemSheet track={track} onClose={onClose} />
      </SafeAreaProvider>
    </Wrapper>,
  );
  return { ...ctx, onClose };
}

const send = () => screen.getByRole("button", { name: en.bugReports.form.send });
const type = (text: string) =>
  fireEvent.changeText(screen.getByLabelText(en.bugReports.form.description), text);
const pick = (label: string) => fireEvent.press(screen.getByRole("button", { name: label }));

describe("the report form", () => {
  it("keeps Send disabled until a category is chosen and the description is valid", async () => {
    const ctx = await setup();
    await type("abcde");
    expect(stateFlag(send(), "disabled")).toBe(true);

    await pick(en.bugReports.categories.ui);
    await type("abcd");
    expect(stateFlag(send(), "disabled")).toBe(true);
    expect(screen.getByText("Write at least 5 characters")).toBeTruthy();

    await type("abcde");
    expect(stateFlag(send(), "disabled")).toBeFalsy();

    await type("a".repeat(2001));
    expect(stateFlag(send(), "disabled")).toBe(true);
    expect(screen.getByText("Use 2000 characters or fewer")).toBeTruthy();

    await fireEvent.press(send());
    expect(ctx.createBugReport).not.toHaveBeenCalled();
  });

  it("shows the counter only near the limit", async () => {
    await setup();
    await type("a".repeat(1799));
    expect(screen.queryByText("1799 / 2000")).toBeNull();
    expect(screen.queryByText("1800 / 2000")).toBeNull();
    await type("a".repeat(1800));
    expect(screen.getByText("1800 / 2000")).toBeTruthy();
  });

  it("sends the chosen category and the trimmed description, without a track", async () => {
    const ctx = await setup();
    await pick(en.bugReports.categories.ui);
    await type("  Hello there  ");
    await fireEvent.press(send());
    expect(ctx.createBugReport).toHaveBeenCalledTimes(1);
    expect(ctx.createBugReport).toHaveBeenCalledWith({
      category: "ui",
      description: "Hello there",
    });
    expect(screen.queryByText(/^About:/)).toBeNull();
  });

  it("attaches the track and shows its title", async () => {
    const ctx = await setup({}, { id: "t1", title: "Menu Song" });
    expect(screen.getByText("About: Menu Song")).toBeTruthy();
    await pick(en.bugReports.categories.playback);
    await type("It stops");
    await fireEvent.press(send());
    expect(ctx.createBugReport).toHaveBeenCalledWith({
      category: "playback",
      description: "It stops",
      entity: { type: "track", id: "t1" },
    });
  });

  it("shows a busy Send while sending and does not send twice", async () => {
    let release: (outcome: HttpOutcome<BugReport>) => void = () => undefined;
    const ctx = await setup({
      createBugReport: () =>
        new Promise<HttpOutcome<BugReport>>((resolve) => {
          release = resolve;
        }),
    });
    await pick(en.bugReports.categories.other);
    await type("abcde");
    await fireEvent.press(send());
    expect(stateFlag(send(), "busy")).toBe(true);
    await fireEvent.press(send());
    expect(ctx.createBugReport).toHaveBeenCalledTimes(1);
    await act(() => {
      release({ kind: "success", data: bugReportFixture, maxAgeSeconds: 0 });
    });
  });

  it("keeps the form open with the error and the text after a failure", async () => {
    const ctx = await setup({
      createBugReport: () => Promise.resolve({ kind: "api_failure", reason: "upstream_error" }),
    });
    await pick(en.bugReports.categories.crash);
    await type("It crashed");
    await fireEvent.press(send());
    expect(await screen.findByText(en.common.error.generic)).toBeTruthy();
    expect(screen.getByLabelText(en.bugReports.form.description).props.value).toBe("It crashed");
    expect(
      stateFlag(screen.getByRole("button", { name: en.bugReports.categories.crash }), "selected"),
    ).toBe(true);
    expect(ctx.onClose).not.toHaveBeenCalled();
  });

  it("confirms and closes after the notice time on success", async () => {
    jest.useFakeTimers({ advanceTimers: true });
    const ctx = await setup();
    await pick(en.bugReports.categories.ui);
    await type("abcde");
    await fireEvent.press(send());
    expect(await screen.findByText(en.bugReports.form.sent)).toBeTruthy();
    expect(ctx.onClose).not.toHaveBeenCalled();
    await act(() => {
      jest.advanceTimersByTime(motion.duration.notice + 1);
    });
    expect(ctx.onClose).toHaveBeenCalledTimes(1);
  });

  it("reads its labels in Spanish", async () => {
    await i18n.changeLanguage("es");
    await setup();
    const es = resources.es.bugReports;
    expect(screen.getByText(es.form.title)).toBeTruthy();
    expect(screen.getByText(es.form.category)).toBeTruthy();
    for (const label of Object.values(es.categories)) {
      expect(screen.getByRole("button", { name: label })).toBeTruthy();
    }
  });
});

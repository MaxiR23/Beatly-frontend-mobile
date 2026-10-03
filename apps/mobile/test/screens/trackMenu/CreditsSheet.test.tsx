// apps/mobile/test/screens/trackMenu/CreditsSheet.test.tsx
//
// Tests for the credits sheet.
//
// Tested:
// - CreditsSheet, opened from the track menu
//
// What is covered:
// - each section's localized title and names, then the other sections, sections without names left out
// - "Credits not available" for the empty credits, the error with retry that refetches, loading
//
// Run with: pnpm --filter @beatly/mobile test -- CreditsSheet
//
// SEE: apps/mobile/src/screens/trackMenu/CreditsSheet.tsx

import { describe, expect, it } from "@jest/globals";
import { fireEvent, screen } from "@testing-library/react-native";

import { resources } from "../../../src/i18n/resources.ts";
import { emptyCreditsFixture } from "../../helpers/core.tsx";
import { setupMenu } from "./trackMenuHelpers.tsx";

const en = resources.en;

async function openCredits(options: Parameters<typeof setupMenu>[0] = {}) {
  const ctx = await setupMenu(options);
  await fireEvent.press(screen.getByRole("button", { name: en.trackMenu.more }));
  await fireEvent.press(screen.getByRole("button", { name: en.trackMenu.items.credits }));
  return ctx;
}

describe("the credits sheet", () => {
  it("draws each section's title and names, then the other sections", async () => {
    const ctx = await openCredits();
    expect(await screen.findByText("Performed by")).toBeTruthy();
    expect(ctx.getCredits).toHaveBeenCalledWith("t1");
    expect(screen.getByText(en.trackMenu.credits.title)).toBeTruthy();
    expect(screen.getByText("Test Artist")).toBeTruthy();
    expect(screen.getByText("Written by")).toBeTruthy();
    expect(screen.getByText("Writer One, Writer Two")).toBeTruthy();
    expect(screen.getByText("Mixed by")).toBeTruthy();
    expect(screen.getByText("Mixer")).toBeTruthy();
  });

  it("leaves out a section with no names", async () => {
    await openCredits({
      getCredits: () =>
        Promise.resolve({
          kind: "success",
          maxAgeSeconds: 0,
          data: {
            ...emptyCreditsFixture,
            performed_by: { localized_title: "Performed by", names: ["Test Artist"] },
            produced_by: { localized_title: "Produced by", names: [] },
          },
        }),
    });
    expect(await screen.findByText("Performed by")).toBeTruthy();
    expect(screen.queryByText("Produced by")).toBeNull();
  });

  it("draws 'Credits not available' for the empty credits", async () => {
    await openCredits({
      getCredits: () =>
        Promise.resolve({ kind: "success", maxAgeSeconds: 0, data: emptyCreditsFixture }),
    });
    expect(await screen.findByText(en.trackMenu.credits.empty)).toBeTruthy();
  });

  it("draws the error with retry and refetches", async () => {
    const ctx = await openCredits({
      getCredits: () => Promise.resolve({ kind: "transport_failure", cause: "network" }),
    });
    expect(await screen.findByText(en.common.error.generic)).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: en.common.retry }));
    expect(ctx.getCredits).toHaveBeenCalledTimes(2);
  });

  it("draws loading", async () => {
    await openCredits({ getCredits: () => new Promise<never>(() => undefined) });
    expect(screen.getByRole("progressbar", { name: en.common.loading })).toBeTruthy();
  });
});

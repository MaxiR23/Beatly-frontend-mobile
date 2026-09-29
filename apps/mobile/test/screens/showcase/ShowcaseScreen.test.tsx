// apps/mobile/test/screens/showcase/ShowcaseScreen.test.tsx
//
// Tests for the Phase 1 showcase screen.
//
// Tested:
// - ShowcaseScreen
//
// What is covered:
// - Every component and state draws, with every string resolved, in en
//   and in es
// - The screen sits on the base surface token
//
// Run with: pnpm --filter @beatly/mobile test -- ShowcaseScreen
//
// SEE: apps/mobile/src/screens/showcase/ShowcaseScreen.tsx

import { color } from "@beatly/ui";
import { afterEach, describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { i18n } from "../../../src/adapters/i18n.ts";
import { resources } from "../../../src/i18n/resources.ts";
import { ShowcaseScreen } from "../../../src/screens/showcase/ShowcaseScreen.tsx";

afterEach(async () => {
  await i18n.changeLanguage("en");
});

function expectEveryComponent(r: (typeof resources)["en"] | (typeof resources)["es"]) {
  const s = r.showcase;
  expect(screen.getByText(s.title)).toBeTruthy();
  for (const sample of Object.values(s.text)) {
    expect(screen.getByText(sample)).toBeTruthy();
  }
  expect(screen.getAllByText(s.buttons.primary).length).toBeGreaterThan(0);
  expect(screen.getAllByText(s.buttons.secondary).length).toBeGreaterThan(0);
  expect(screen.getAllByText(s.buttons.ghost).length).toBeGreaterThan(0);
  expect(screen.getAllByLabelText(s.buttons.loading).length).toBe(3);
  expect(screen.getAllByText(s.buttons.disabled).length).toBe(3);
  expect(screen.getAllByText(s.input.label).length).toBe(2);
  expect(screen.getByText(s.input.error)).toBeTruthy();
  expect(screen.getAllByText(s.empty.message).length).toBe(2);
  expect(screen.getByText(s.empty.action)).toBeTruthy();
  expect(screen.getByText(r.common.error.generic)).toBeTruthy();
  expect(screen.getByText(r.common.retry)).toBeTruthy();
  expect(screen.getByLabelText(r.common.loading)).toBeTruthy();
}

describe("ShowcaseScreen", () => {
  it("draws every component in en", async () => {
    await render(<ShowcaseScreen />);

    expectEveryComponent(resources.en);
  });

  it("draws every component in es", async () => {
    await i18n.changeLanguage("es");
    await render(<ShowcaseScreen />);

    expectEveryComponent(resources.es);
  });

  it("draws on the base surface", async () => {
    await render(<ShowcaseScreen />);

    expect(StyleSheet.flatten(screen.getByTestId("showcase").props.style)).toMatchObject({
      backgroundColor: color.surface.base,
    });
  });
});

// apps/mobile/test/app/(tabs)/_layout.test.tsx
//
// Tests for the tab navigator.
//
// Tested:
// - the tabs layout on the floating bar branch
//
// What is covered:
// - four icon-only tabs with accessible labels, home selected on "/", each placeholder from its tab
//
// Run with: pnpm --filter @beatly/mobile test -- _layout
//
// SEE: apps/mobile/app/(tabs)/_layout.tsx

import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, renderRouter, screen } from "expo-router/testing-library";

import { resources } from "../../../src/i18n/resources.ts";
import { installCore } from "../../helpers/routeCore.ts";

jest.mock("../../../src/createCore.ts", () => ({ createCore: () => mockCore.current }));
const mockCore = installCore();

const en = resources.en;

function isSelected(node: { props: unknown }): unknown {
  const props = node.props as { accessibilityState?: { selected?: unknown } };
  return props.accessibilityState?.selected;
}

describe("the tabs layout", () => {
  it("draws four tabs with their accessible labels", async () => {
    mockCore.set("signed_in");
    await renderRouter("app", { initialUrl: "/" });
    await screen.findByTestId("home");
    for (const label of [en.tabs.home, en.tabs.explore, en.tabs.search, en.tabs.library]) {
      expect(screen.getByRole("tab", { name: label })).toBeTruthy();
      expect(screen.queryByText(label)).toBeNull();
    }
  });

  it("selects home on /", async () => {
    mockCore.set("signed_in");
    await renderRouter("app", { initialUrl: "/" });
    await screen.findByTestId("home");
    expect(isSelected(screen.getByRole("tab", { name: en.tabs.home }))).toBe(true);
    expect(isSelected(screen.getByRole("tab", { name: en.tabs.explore }))).toBe(false);
  });

  it.each([
    ["explore", en.tabs.explore],
    ["search", en.tabs.search],
    ["library", en.tabs.library],
  ])("opens the %s placeholder from its tab", async (testID, label) => {
    mockCore.set("signed_in");
    await renderRouter("app", { initialUrl: "/" });
    await screen.findByTestId("home");
    await fireEvent.press(screen.getByRole("tab", { name: label }));
    expect(await screen.findByTestId(testID)).toBeTruthy();
    expect(screen.getByText(en.tabs.placeholder)).toBeTruthy();
    expect(isSelected(screen.getByRole("tab", { name: label }))).toBe(true);
  });
});

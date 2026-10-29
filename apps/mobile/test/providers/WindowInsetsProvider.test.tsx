// apps/mobile/test/providers/WindowInsetsProvider.test.tsx
//
// Tests for the window insets provider.
//
// Tested:
// - WindowInsetsProvider, useWindowInsets
//
// What is covered:
// - the window's insets inside a nested provider with a native tab's (34, not 83), and the throw outside the provider
//
// Run with: pnpm --filter @beatly/mobile test -- WindowInsetsProvider
//
// SEE: apps/mobile/src/providers/WindowInsetsProvider.tsx

import { describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useWindowInsets } from "../../src/providers/WindowInsetsProvider.tsx";
import { Insets, tabMetrics, windowMetrics } from "../helpers/insets.tsx";

function Probe() {
  const window = useWindowInsets();
  const nearest = useSafeAreaInsets();
  return <Text testID="probe">{[window.top, window.bottom, nearest.bottom].join("/")}</Text>;
}

describe("WindowInsetsProvider", () => {
  it("gives the window's insets inside a native tab's own provider, not the tab's", async () => {
    await render(
      <Insets tab>
        <Probe />
      </Insets>,
    );
    expect(screen.getByTestId("probe").props.children).toBe(
      [windowMetrics.insets.top, windowMetrics.insets.bottom, tabMetrics.insets.bottom].join("/"),
    );
    expect(windowMetrics.insets.bottom).toBe(34);
    expect(tabMetrics.insets.bottom).toBe(83);
  });

  it("throws outside the provider", async () => {
    await expect(render(<Probe />)).rejects.toThrow("useWindowInsets outside WindowInsetsProvider");
  });
});

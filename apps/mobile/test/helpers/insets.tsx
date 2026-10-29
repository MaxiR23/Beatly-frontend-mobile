// apps/mobile/test/helpers/insets.tsx
//
// Test helper: renders a tree inside the window's insets provider, optionally nested in a native tab's own safe-area provider.
//
// Tested:
// - Not a test itself; used by the screen and provider tests
//
// What is covered:
// - the zero insets every screen test uses, the iOS 27 window (bottom 34) and native tab (bottom 83) metrics measured in issue 144, and the assertion that a sheet is attached to the bottom and side edges with its content the window's bottom inset above the bottom edge
//
// Run with: pnpm --filter @beatly/mobile test
//
// SEE: apps/mobile/src/providers/WindowInsetsProvider.tsx

import { expect } from "@jest/globals";
import { layout } from "@beatly/ui";
import { screen } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { WindowInsetsProvider } from "../../src/providers/WindowInsetsProvider.tsx";
import { flatStyle } from "./flatStyle.ts";

export const zeroMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

export const windowMetrics = {
  frame: { x: 0, y: 0, width: 402, height: 874 },
  insets: { top: 62, left: 0, right: 0, bottom: 34 },
};

export const tabMetrics = {
  frame: { x: 0, y: 0, width: 402, height: 874 },
  insets: { top: 62, left: 0, right: 0, bottom: 83 },
};

// With `tab`, a native tab's own provider is nested under the window's, as expo-router's iOS native tabs do.
export function Insets({
  tab = false,
  children,
}: {
  readonly tab?: boolean;
  readonly children: ReactNode;
}) {
  if (!tab) {
    return (
      <SafeAreaProvider initialMetrics={zeroMetrics}>
        <WindowInsetsProvider>{children}</WindowInsetsProvider>
      </SafeAreaProvider>
    );
  }
  return (
    <SafeAreaProvider initialMetrics={windowMetrics}>
      <WindowInsetsProvider>
        <SafeAreaProvider initialMetrics={tabMetrics}>{children}</SafeAreaProvider>
      </WindowInsetsProvider>
    </SafeAreaProvider>
  );
}

// Every key that would put a bottom or side margin between the iOS sheet and the window's edges.
const edgeKeys = [
  "padding",
  "paddingHorizontal",
  "paddingVertical",
  "paddingBottom",
  "paddingLeft",
  "paddingRight",
  "paddingStart",
  "paddingEnd",
  "margin",
  "marginHorizontal",
  "marginVertical",
  "marginBottom",
  "marginLeft",
  "marginRight",
  "marginStart",
  "marginEnd",
] as const;

export function expectSheetOverWindow(options: { top: boolean }) {
  const frame = flatStyle(screen.getByTestId("sheet-frame").props.style);
  const surface = flatStyle(screen.getByTestId("sheet-surface").props.style);
  expect(frame.paddingTop).toBe((options.top ? windowMetrics.insets.top : 0) + layout.gutter);
  for (const key of edgeKeys) {
    expect({ key, value: frame[key] ?? 0 }).toEqual({ key, value: 0 });
    if (key.startsWith("margin"))
      expect({ key, value: surface[key] ?? 0 }).toEqual({ key, value: 0 });
  }
  expect(flatStyle(screen.getByTestId("sheet-content").props.style).paddingBottom).toBe(
    windowMetrics.insets.bottom,
  );
}

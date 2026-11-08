// apps/mobile/test/helpers/rowSpacing.ts
//
// Test helper: asserts that a container puts no space between its rows.
//
// Tested:
// - Not a test itself; used by the screen tests of every container of rows
//
// What is covered:
// - expectFlushRows: no gap, vertical padding or margin on the container or its direct rows
// - expectNoRowSeparator: no separator component and no gap on a list
//
// Run with: pnpm --filter @beatly/mobile test
//
// SEE: DESIGN.md, Rows

import { expect } from "@jest/globals";
import type { screen } from "@testing-library/react-native";

import { flatStyle } from "./flatStyle.ts";

type Node = ReturnType<typeof screen.getByTestId>;

const containerKeys = [
  "gap",
  "rowGap",
  "columnGap",
  "paddingVertical",
  "paddingTop",
  "paddingBottom",
] as const;
const rowKeys = ["margin", "marginTop", "marginBottom", "marginVertical"] as const;

export function expectFlushRows(container: Node): void {
  const own = flatStyle(container.props.style);
  for (const key of containerKeys) expect(own[key]).toBeUndefined();
  // The direct children are the rows: each one's own root view carries no margin.
  for (const row of container.children) {
    if (typeof row === "string") continue;
    const style = flatStyle(row.props.style);
    for (const key of rowKeys) expect(style[key]).toBeUndefined();
  }
}

export function expectNoRowSeparator(list: Node): void {
  expect(list.props.ItemSeparatorComponent).toBeUndefined();
  const content = flatStyle(list.props.contentContainerStyle);
  expect(content.gap).toBeUndefined();
  expect(content.rowGap).toBeUndefined();
}

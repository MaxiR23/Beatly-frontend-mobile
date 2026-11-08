// packages/ui/test/components/RowSection.test.tsx
//
// Tests for the RowSection and the SectionTitle.
//
// Tested:
// - RowSection
// - SectionTitle
//
// What is covered:
// - the title in the section variant with the gutter at its sides and spacing.md under it
// - the action at the title's end
// - the rows drawn with no gap, padding or margin between them
// - SectionTitle: the same title row alone
//
// Run with: pnpm --filter @beatly/ui test -- RowSection
//
// SEE: packages/ui/src/components/RowSection.tsx

import { describe, expect, it } from "@jest/globals";
import { render, screen, within } from "@testing-library/react-native";
import { Text } from "react-native";

import { RowSection, SectionTitle } from "../../src/components/RowSection.tsx";
import { layout, spacing } from "../../src/tokens/spacing.ts";
import { typography } from "../../src/tokens/typography.ts";
import { flatStyle } from "../helpers/flatStyle.ts";

describe("RowSection", () => {
  it("draws the title in the section variant with the gutter at its sides and spacing.md under it", async () => {
    await render(
      <RowSection title="Songs" testID="s">
        <Text>row</Text>
      </RowSection>,
    );
    const title = screen.getByText("Songs");
    expect(flatStyle(title.props.style)).toMatchObject({
      fontSize: typography.section.fontSize,
    });
    const row = title.parent;
    expect(flatStyle(row?.props.style)).toMatchObject({
      paddingHorizontal: layout.gutter,
      paddingBottom: spacing.md,
    });
  });

  it("draws the action at the title's end", async () => {
    await render(
      <RowSection title="Recent" action={<Text>Clear</Text>} testID="s">
        <Text>row</Text>
      </RowSection>,
    );
    const texts = within(screen.getByTestId("s"))
      .getAllByText(/.+/)
      .map((node) => node.props.children as unknown);
    expect(texts).toEqual(["Recent", "Clear", "row"]);
  });

  it("draws the rows with no gap, padding or margin between them", async () => {
    await render(
      <RowSection title="Songs" testID="s">
        <Text>one</Text>
        <Text>two</Text>
      </RowSection>,
    );
    expect(flatStyle(screen.getByTestId("s-rows").props.style)).toEqual({});
    expect(within(screen.getByTestId("s-rows")).getAllByText(/one|two/)).toHaveLength(2);
  });

  it("SectionTitle draws the same title row alone", async () => {
    await render(<SectionTitle title="Popular" action={<Text>More</Text>} testID="t" />);
    expect(flatStyle(screen.getByTestId("t").props.style)).toMatchObject({
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: layout.gutter,
      paddingBottom: spacing.md,
    });
    expect(within(screen.getByTestId("t")).getByText("Popular")).toBeTruthy();
    expect(within(screen.getByTestId("t")).getByText("More")).toBeTruthy();
  });
});

// packages/ui/test/components/AvatarRow.test.tsx
//
// Tests for the AvatarRow.
//
// Tested:
// - AvatarRow
//
// What is covered:
// - the initials, title and subtitle with an identity, the skeleton in place of the avatar and title without one, and the press in both
//
// Run with: pnpm --filter @beatly/ui test -- AvatarRow
//
// SEE: packages/ui/src/components/AvatarRow.tsx

import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { initialsOf } from "../../src/components/avatarIdentity.ts";
import { AvatarRow } from "../../src/components/AvatarRow.tsx";

describe("AvatarRow", () => {
  it("draws the avatar initials, the title and the subtitle", async () => {
    await render(
      <AvatarRow
        identity={{ name: "maxi_23", title: "Maxi" }}
        subtitle="View profile"
        accessibilityLabel="Maxi, view profile"
        onPress={jest.fn()}
      />,
    );
    expect(screen.getByText("Maxi")).toBeTruthy();
    expect(screen.getByText("View profile")).toBeTruthy();
    expect(screen.getByText(initialsOf("maxi_23"))).toBeTruthy();
    expect(screen.queryByTestId("avatar-row-skeleton")).toBeNull();
  });

  it("draws the skeleton in place of the avatar and the title, keeps the subtitle and still presses", async () => {
    const onPress = jest.fn();
    await render(
      <AvatarRow
        identity={null}
        subtitle="View profile"
        accessibilityLabel="View profile label"
        onPress={onPress}
      />,
    );
    expect(screen.getByTestId("avatar-row-skeleton")).toBeTruthy();
    expect(screen.getByText("View profile")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "View profile label" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

// packages/ui/test/components/ErrorText.test.tsx
//
// Tests for the error line and its announcement.
//
// Tested:
// - ErrorText
//
// What is covered:
// - The message in typography.meta and color.status.error, in a wrapper View with no style
// - Both platforms: the alert role and the polite live region on the wrapper
// - iOS: announced once on mount, never again on a re-render with the same message and attempt, again on a changed message, again on a new attempt with the same message, not when it unmounts, again when it mounts again
// - Android: never announced
//
// Run with: pnpm --filter @beatly/ui test -- ErrorText
//
// SEE: packages/ui/src/components/ErrorText.tsx, packages/ui/src/components/useAnnounce.ts

import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import { AccessibilityInfo, Platform, type StyleProp, type TextStyle } from "react-native";

import { ErrorText } from "../../src/components/ErrorText.tsx";
import { color } from "../../src/tokens/color.ts";
import { typography } from "../../src/tokens/typography.ts";
import { flatStyle } from "../helpers/flatStyle.ts";

const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility");

beforeEach(() => {
  announce.mockClear();
});

afterEach(() => {
  Platform.OS = "ios";
});

describe("ErrorText", () => {
  it("draws the message in the meta size and the error color, in an unstyled wrapper", async () => {
    await render(<ErrorText message="Wrong" testID="e" />);
    const style = flatStyle(screen.getByText("Wrong").props.style as StyleProp<TextStyle>);
    expect(style.color).toBe(color.status.error);
    expect(style.fontSize).toBe(typography.meta.fontSize);
    expect(screen.getByTestId("e").props.style).toBeUndefined();
  });

  it.each(["ios", "android"] as const)("is a polite alert on %s", async (os) => {
    Platform.OS = os;
    await render(<ErrorText message="Wrong" testID="e" />);
    expect(screen.getByTestId("e").props.accessibilityRole).toBe("alert");
    expect(screen.getByTestId("e").props.accessibilityLiveRegion).toBe("polite");
  });

  it("announces once, not on every render", async () => {
    await render(<ErrorText message="Wrong" attempt={1} />);
    await screen.rerender(<ErrorText message="Wrong" attempt={1} />);
    expect(announce.mock.calls).toEqual([["Wrong"]]);
  });

  it("announces a changed message", async () => {
    await render(<ErrorText message="Wrong" attempt={1} />);
    await screen.rerender(<ErrorText message="Locked" attempt={1} />);
    expect(announce.mock.calls).toEqual([["Wrong"], ["Locked"]]);
  });

  it("announces the same message again on a new attempt", async () => {
    await render(<ErrorText message="Wrong" attempt={1} />);
    await screen.rerender(<ErrorText message="Wrong" attempt={2} />);
    expect(announce.mock.calls).toEqual([["Wrong"], ["Wrong"]]);
  });

  it("is quiet when it goes away and announces again when it comes back", async () => {
    await render(<ErrorText message="Wrong" />);
    await screen.rerender(<></>);
    expect(announce.mock.calls).toEqual([["Wrong"]]);
    await screen.rerender(<ErrorText message="Wrong" />);
    expect(announce.mock.calls).toEqual([["Wrong"], ["Wrong"]]);
  });

  it("does not announce on Android", async () => {
    Platform.OS = "android";
    await render(<ErrorText message="Wrong" attempt={1} />);
    expect(announce).not.toHaveBeenCalled();
  });
});

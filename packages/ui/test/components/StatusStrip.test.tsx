// packages/ui/test/components/StatusStrip.test.tsx
//
// Tests for the StatusStrip.
//
// Tested:
// - StatusStrip
//
// What is covered:
// - the iOS capsule and the Android small-corner rectangle, both at the strip height
// - the glyph and the message in the meta role
// - without onPress an alert and no button; with onPress a button labelled with the message that calls it
// - iOS announces the message on mount and when it changes; Android keeps the polite live region
//
// Run with: pnpm --filter @beatly/ui test -- StatusStrip
//
// SEE: packages/ui/src/components/StatusStrip.tsx

import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { AccessibilityInfo, Platform } from "react-native";

import { StatusStrip } from "../../src/components/StatusStrip.tsx";
import { color } from "../../src/tokens/color.ts";
import { radius } from "../../src/tokens/radius.ts";
import { layout } from "../../src/tokens/spacing.ts";
import { typography } from "../../src/tokens/typography.ts";

interface ReactNativeView {
  View: unknown;
}

jest.mock("expo-glass-effect", () => {
  const { View } = jest.requireActual<ReactNativeView>("react-native");
  return {
    GlassView: View,
    isLiquidGlassAvailable: () => false,
    isGlassEffectAPIAvailable: () => false,
  };
});

interface JsonNode {
  props: Record<string, unknown>;
  children: unknown;
}

function isJsonNode(value: unknown): value is JsonNode {
  return typeof value === "object" && value !== null && "props" in value;
}

function iconClasses(): string[] {
  const found: JsonNode[] = [];
  const visit = (node: unknown) => {
    if (Array.isArray(node)) node.forEach(visit);
    if (!isJsonNode(node)) return;
    if ("xmlns" in node.props) found.push(node);
    visit(node.children);
  };
  visit(screen.toJSON());
  return String(found[0]?.props.className).split(/\s+/);
}

const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility");

beforeEach(() => {
  announce.mockClear();
});

afterEach(() => {
  Platform.OS = "ios";
});

describe("StatusStrip", () => {
  it("draws the iOS capsule at the strip height", async () => {
    await render(<StatusStrip icon="wifiOff" message="Offline" testID="strip" />);
    expect(screen.getByTestId("strip")).toHaveStyle({
      borderRadius: radius.full,
      height: layout.statusStripHeight,
    });
  });

  it("draws the Android rectangle with small corners", async () => {
    Platform.OS = "android";
    await render(<StatusStrip icon="wifiOff" message="Offline" testID="strip" />);
    expect(screen.getByTestId("strip")).toHaveStyle({
      borderRadius: radius.sm,
      height: layout.statusStripHeight,
    });
  });

  it.each([
    ["wifiOff", "lucide-wifi-off"],
    ["alert", "lucide-triangle-alert"],
  ] as const)("draws the %s glyph and the message in the meta role", async (name, glyph) => {
    await render(<StatusStrip icon={name} message="Offline" />);
    expect(iconClasses()).toContain(glyph);
    expect(screen.getByText("Offline")).toHaveStyle({
      fontSize: typography.meta.fontSize,
      color: color.text.primary,
    });
  });

  it("is an alert without a button when it has no onPress", async () => {
    await render(<StatusStrip icon="wifiOff" message="Offline" />);
    expect(screen.getByTestId("status-strip-content").props.accessibilityRole).toBe("alert");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("is a button labelled with the message that calls onPress", async () => {
    const onPress = jest.fn();
    await render(<StatusStrip icon="alert" message="Tap to retry" onPress={onPress} />);
    const button = screen.getByRole("button", { name: "Tap to retry" });
    expect(button.props.accessibilityLiveRegion).toBe("polite");
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe("StatusStrip announcements", () => {
  it("announces the message on mount and when it changes on iOS", async () => {
    await render(<StatusStrip icon="wifiOff" message="Offline" />);
    await screen.rerender(<StatusStrip icon="wifiOff" message="Offline" />);
    await screen.rerender(<StatusStrip icon="alert" message="Failed" />);
    expect(announce.mock.calls).toEqual([["Offline"], ["Failed"]]);
  });

  it("does not announce on Android and keeps the polite live region", async () => {
    Platform.OS = "android";
    await render(<StatusStrip icon="wifiOff" message="Offline" />);
    expect(announce).not.toHaveBeenCalled();
    expect(screen.getByTestId("status-strip-content").props.accessibilityLiveRegion).toBe("polite");
  });
});

// packages/ui/test/components/ErrorState.test.tsx
//
// Tests for the ErrorState.
//
// Tested:
// - ErrorState
//
// What is covered:
// - one glyph per cause (wifi off, clock, triangle alert)
// - the round mark at the hero icon size with full corners
// - the title, the message and Retry calling onRetry
// - the alert role and polite live region; iOS announces "title. message" once, Android does not announce
//
// Run with: pnpm --filter @beatly/ui test -- ErrorState.test
//
// SEE: packages/ui/src/components/ErrorState.tsx

import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { AccessibilityInfo, Platform } from "react-native";

import { ErrorState, type ErrorCause } from "../../src/components/ErrorState.tsx";
import { icon } from "../../src/tokens/icon.ts";
import { radius } from "../../src/tokens/radius.ts";

interface JsonNode {
  props: Record<string, unknown>;
  children: unknown;
}

function isJsonNode(value: unknown): value is JsonNode {
  return typeof value === "object" && value !== null && "props" in value;
}

function svgRoots(tree: unknown): JsonNode[] {
  const found: JsonNode[] = [];
  const visit = (node: unknown) => {
    if (Array.isArray(node)) node.forEach(visit);
    if (!isJsonNode(node)) return;
    if ("xmlns" in node.props) found.push(node);
    visit(node.children);
  };
  visit(tree);
  return found;
}

function iconClasses(): string[] {
  const [root] = svgRoots(screen.toJSON());
  return String(root?.props.className).split(/\s+/);
}

const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility");

beforeEach(() => {
  announce.mockClear();
});

afterEach(() => {
  Platform.OS = "ios";
});

function draw(cause: ErrorCause = "server", onRetry = jest.fn()) {
  return render(
    <ErrorState
      cause={cause}
      title="Title"
      message="Message"
      retryLabel="Retry"
      onRetry={onRetry}
    />,
  );
}

describe("ErrorState", () => {
  it.each([
    ["offline", "lucide-wifi-off"],
    ["slow", "lucide-clock"],
    ["server", "lucide-triangle-alert"],
  ] as const)("draws the %s cause with its glyph", async (cause, glyph) => {
    await draw(cause);
    expect(iconClasses()).toContain(glyph);
  });

  it("draws the mark as a hero-size circle", async () => {
    await draw();
    expect(screen.getByTestId("error-state-mark")).toHaveStyle({
      width: icon.size.hero,
      height: icon.size.hero,
      borderRadius: radius.full,
    });
  });

  it("draws the title and the message and calls onRetry", async () => {
    const onRetry = jest.fn();
    await draw("server", onRetry);
    expect(screen.getByText("Title")).toBeTruthy();
    expect(screen.getByText("Message")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("announces the title and the message once on iOS", async () => {
    await draw();
    await screen.rerender(
      <ErrorState
        cause="server"
        title="Title"
        message="Message"
        retryLabel="Retry"
        onRetry={jest.fn()}
      />,
    );
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith("Title. Message");
  });

  it.each(["ios", "android"] as const)("marks the texts as a polite alert on %s", async (os) => {
    Platform.OS = os;
    await draw();
    const texts = screen.getByTestId("error-state-texts");
    expect(texts.props.accessibilityRole).toBe("alert");
    expect(texts.props.accessibilityLiveRegion).toBe("polite");
  });

  it("does not announce on Android", async () => {
    Platform.OS = "android";
    await draw();
    expect(announce).not.toHaveBeenCalled();
  });
});

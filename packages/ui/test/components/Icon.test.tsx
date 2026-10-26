// packages/ui/test/components/Icon.test.tsx
//
// Tests for the Icon.
//
// Tested:
// - Icon
//
// What is covered:
// - the platform glyphs of back and more on iOS and Android
// - a plain glyph identical on both platforms
// - size, stroke and tone unchanged on the platform glyphs
//
// Run with: pnpm --filter @beatly/ui test -- Icon.test
//
// SEE: packages/ui/src/components/Icon.tsx

import { afterEach, describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import { Platform } from "react-native";

import { Icon, type IconName } from "../../src/components/Icon.tsx";
import { color } from "../../src/tokens/color.ts";
import { icon } from "../../src/tokens/icon.ts";

interface JsonNode {
  props: Record<string, unknown>;
  children: unknown;
}

function isJsonNode(value: unknown): value is JsonNode {
  return typeof value === "object" && value !== null && "props" in value;
}

// Every svg root (it carries xmlns) in the rendered tree.
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

// The lucide class tokens of the drawn glyph, compared whole (lucide-ellipsis is a prefix of lucide-ellipsis-vertical).
function classes(): string[] {
  const [root] = svgRoots(screen.toJSON());
  return String(root?.props.className).split(/\s+/);
}

afterEach(() => {
  Platform.OS = "ios";
});

describe("Icon", () => {
  it.each<[string, IconName, string, string]>([
    ["ios", "back", "lucide-chevron-left", "lucide-arrow-left"],
    ["android", "back", "lucide-arrow-left", "lucide-chevron-left"],
    ["ios", "more", "lucide-ellipsis", "lucide-ellipsis-vertical"],
    ["android", "more", "lucide-ellipsis-vertical", "lucide-ellipsis"],
  ])("on %s, %s draws %s and not %s", async (platform, name, expected, other) => {
    Platform.OS = platform === "android" ? "android" : "ios";
    await render(<Icon name={name} />);
    expect(classes()).toContain(expected);
    expect(classes()).not.toContain(other);
  });

  it.each(["ios", "android"] as const)("draws a plain glyph the same on %s", async (platform) => {
    Platform.OS = platform;
    const name: IconName = "heart";
    await render(<Icon name={name} />);
    expect(classes()).toContain("lucide-heart");
  });

  it("keeps the size, stroke and tone on the Android glyphs", async () => {
    Platform.OS = "android";
    await render(<Icon name="more" size="lg" />);
    const [root] = svgRoots(screen.toJSON());
    expect(root?.props).toMatchObject({
      width: icon.size.lg,
      height: icon.size.lg,
      strokeWidth: icon.stroke,
    });
    expect(JSON.stringify(root)).toContain(color.text.primary);
  });
});

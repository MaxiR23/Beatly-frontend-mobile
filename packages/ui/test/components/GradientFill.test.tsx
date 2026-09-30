// packages/ui/test/components/GradientFill.test.tsx
//
// Tests for the GradientFill.
//
// Tested:
// - GradientFill
//
// What is covered:
// - the stop colors and offsets for two and three colors, the gradient direction,
//   the stop alpha taken from the color (a transparent stop stays transparent)
//
// Run with: pnpm --filter @beatly/ui test -- GradientFill
//
// SEE: packages/ui/src/components/GradientFill.tsx

import { describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import { processColor } from "react-native";

import { GradientFill } from "../../src/components/GradientFill.tsx";
import { color } from "../../src/tokens/color.ts";

interface JsonNode {
  props: Record<string, unknown>;
  children: unknown;
}

function isJsonNode(value: unknown): value is JsonNode {
  return typeof value === "object" && value !== null && "props" in value;
}

// Collects, from the rendered tree, every node whose props include the given key.
function nodesWithProp(tree: unknown, key: string): JsonNode[] {
  const found: JsonNode[] = [];
  const visit = (node: unknown) => {
    if (Array.isArray(node)) node.forEach(visit);
    if (!isJsonNode(node)) return;
    if (key in node.props) found.push(node);
    visit(node.children);
  };
  visit(tree);
  return found;
}

// The svg renderer stores the gradient as [offset, color, ...] with signed ARGB colors.
const argb = (color: string) => Number(processColor(color)) | 0;

describe("GradientFill", () => {
  it("draws two stops at offsets 0 and 1 on a diagonal", async () => {
    await render(<GradientFill colors={["#112233", "#445566"]} direction="diagonal" />);
    const [gradient] = nodesWithProp(screen.toJSON(), "gradient");
    expect(gradient?.props.gradient).toEqual([0, argb("#112233"), 1, argb("#445566")]);
    expect(gradient?.props).toMatchObject({ x1: "0", y1: "0", x2: "1", y2: "1" });
  });

  it("draws three stops at offsets 0, 0.5 and 1 on a vertical", async () => {
    await render(<GradientFill colors={["#112233", "#445566", "#778899"]} direction="vertical" />);
    const [gradient] = nodesWithProp(screen.toJSON(), "gradient");
    expect(gradient?.props.gradient).toEqual([
      0,
      argb("#112233"),
      0.5,
      argb("#445566"),
      1,
      argb("#778899"),
    ]);
    expect(gradient?.props).toMatchObject({ x1: "0", y1: "0", x2: "0", y2: "1" });
  });

  it("keeps the alpha of a transparent stop and leaves opaque stops opaque", async () => {
    await render(
      <GradientFill
        colors={[color.overlay.clear, color.overlay.clear, color.surface.base]}
        direction="vertical"
      />,
    );
    const [gradient] = nodesWithProp(screen.toJSON(), "gradient");
    const flat = gradient?.props.gradient;
    if (!Array.isArray(flat)) throw new Error("gradient is not an array");
    const alphaAt = (i: number) => (Number(flat[i]) >>> 24) & 0xff;
    expect([flat[0], flat[2], flat[4]]).toEqual([0, 0.5, 1]);
    expect([alphaAt(1), alphaAt(3), alphaAt(5)]).toEqual([0, 0, 255]);
  });
});

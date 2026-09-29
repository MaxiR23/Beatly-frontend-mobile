// packages/ui/test/components/Cover.test.tsx
//
// Tests for the Cover.
//
// Tested:
// - Cover
//
// What is covered:
// - the 2 x 2 mosaic with four urls, the first url with one to three, the placeholder with none, the round shape
//
// Run with: pnpm --filter @beatly/ui test -- Cover
//
// SEE: packages/ui/src/components/Cover.tsx

import { describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";

import { Cover } from "../../src/components/Cover.tsx";
import { radius } from "../../src/tokens/radius.ts";

const urls = ["test://img/1", "test://img/2", "test://img/3", "test://img/4"];

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

describe("Cover", () => {
  it("draws a 2 x 2 mosaic of four images with four urls", async () => {
    await render(<Cover urls={urls} shape="square" />);
    expect(screen.getByTestId("cover-mosaic")).toBeTruthy();
    expect(nodesWithProp(screen.toJSON(), "source")).toHaveLength(4);
    expect(screen.queryByTestId("cover-single")).toBeNull();
  });

  it.each([1, 2, 3])("draws the first url alone with %i urls", async (count) => {
    await render(<Cover urls={urls.slice(0, count)} shape="square" />);
    expect(screen.getByTestId("cover-single").props.source).toEqual({ uri: "test://img/1" });
    expect(screen.queryByTestId("cover-mosaic")).toBeNull();
  });

  it("draws the placeholder with no urls", async () => {
    await render(<Cover urls={[]} shape="square" />);
    expect(screen.getByTestId("cover-placeholder")).toBeTruthy();
    expect(nodesWithProp(screen.toJSON(), "source")).toHaveLength(0);
  });

  it("rounds the box for the round shape", async () => {
    await render(<Cover urls={[]} shape="round" />);
    const box = screen.getByTestId("cover-placeholder").parent;
    expect(box?.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ borderRadius: radius.full })]),
    );
  });
});

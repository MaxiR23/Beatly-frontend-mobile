// packages/ui/test/components/GenreRow.test.tsx
//
// Tests for the GenreRow.
//
// Tested:
// - GenreRow
//
// What is covered:
// - the gradient's first stop from the slug, the fallback, the name, the chevron, the press and its role
//
// Run with: pnpm --filter @beatly/ui test -- GenreRow
//
// SEE: packages/ui/src/components/GenreRow.tsx

import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { processColor } from "react-native";

import { genreGradient } from "../../src/components/genreGradient.ts";
import { GenreRow } from "../../src/components/GenreRow.tsx";

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

describe("GenreRow", () => {
  it.each([
    ["pop", "Pop"],
    ["unknown", "Unknown"],
  ])("starts the bar at the first color of the %s gradient", async (slug, name) => {
    await render(<GenreRow slug={slug} name={name} onPress={jest.fn()} />);
    const [gradient] = nodesWithProp(screen.toJSON(), "gradient");
    // The svg renderer stores the gradient as [offset, color, ...] with signed ARGB colors.
    const expected = Number(processColor(genreGradient(slug)[0])) | 0;
    expect(gradient?.props.gradient).toEqual(expect.arrayContaining([0, expected]));
  });

  it("draws the name and the chevron", async () => {
    await render(<GenreRow slug="pop" name="Pop" onPress={jest.fn()} />);
    expect(screen.getByText("Pop")).toBeTruthy();
    expect(screen.getByTestId("genre-row-chevron")).toBeTruthy();
  });

  it("calls onPress and exposes a button named after the genre", async () => {
    const onPress = jest.fn();
    await render(<GenreRow slug="pop" name="Pop" onPress={onPress} />);
    await fireEvent.press(screen.getByRole("button", { name: "Pop" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

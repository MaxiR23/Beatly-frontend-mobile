// packages/ui/test/components/Cover.test.tsx
//
// Tests for the Cover.
//
// Tested:
// - Cover
//
// What is covered:
// - the 2 x 2 mosaic with four images, the first image with one to three, the placeholder with none, each image at the tier its drawn side needs (a row's small, a card's and a hero mosaic cell's medium, a hero's large), the accent tile with an icon, the round shape, the small and medium corners of a square, the size of the box and the mosaic cells
//
// Run with: pnpm --filter @beatly/ui test -- Cover
//
// SEE: packages/ui/src/components/Cover.tsx

import { describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { Cover } from "../../src/components/Cover.tsx";
import { color } from "../../src/tokens/color.ts";
import { radius } from "../../src/tokens/radius.ts";
import { shadow } from "../../src/tokens/shadow.ts";
import { layout } from "../../src/tokens/spacing.ts";
import { flatStyle } from "../helpers/flatStyle.ts";

const tiers = (n: string) => ({
  small: `test://img/${n}/s`,
  medium: `test://img/${n}/m`,
  large: `test://img/${n}/l`,
});
const images = ["1", "2", "3", "4"].map(tiers);

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
  it("puts the shadow on an unclipped outer view, not on the clipping one", async () => {
    await render(<Cover images={[]} shape="square" corner="md" elevated />);
    const outer: unknown = flatStyle(
      screen.getByTestId("cover-shadow").props.style as StyleProp<ViewStyle>,
    );
    const inner: unknown = flatStyle(
      screen.getByTestId("cover-placeholder").parent?.props.style as StyleProp<ViewStyle>,
    );
    expect(outer).toEqual(expect.objectContaining(shadow.cover));
    expect(outer).not.toHaveProperty("overflow");
    expect(inner).toEqual(expect.objectContaining({ overflow: "hidden", borderRadius: radius.md }));
    expect(inner).not.toHaveProperty("shadowOpacity");
    expect(inner).not.toHaveProperty("elevation");
  });

  it("draws no shadow view when not elevated", async () => {
    await render(<Cover images={[]} shape="square" />);
    expect(screen.queryByTestId("cover-shadow")).toBeNull();
  });

  it("draws a 2 x 2 mosaic of four images with four images", async () => {
    await render(<Cover images={images} shape="square" />);
    expect(screen.getByTestId("cover-mosaic")).toBeTruthy();
    expect(nodesWithProp(screen.toJSON(), "source")).toHaveLength(4);
    expect(screen.queryByTestId("cover-single")).toBeNull();
  });

  it.each([1, 2, 3])("draws the first image alone with %i images", async (count) => {
    await render(<Cover images={images.slice(0, count)} shape="square" />);
    expect(screen.getByTestId("cover-single").props.source).toEqual({ uri: "test://img/1/m" });
    expect(screen.queryByTestId("cover-mosaic")).toBeNull();
  });

  it("draws the small tier at a row's side", async () => {
    await render(<Cover images={images.slice(0, 1)} shape="square" size={layout.rowCover} />);
    expect(screen.getByTestId("cover-single").props.source).toEqual({ uri: "test://img/1/s" });
  });

  it("draws the medium tier at a card's side", async () => {
    await render(<Cover images={images.slice(0, 1)} shape="square" />);
    expect(screen.getByTestId("cover-single").props.source).toEqual({ uri: "test://img/1/m" });
  });

  it("draws the large tier at the hero's side", async () => {
    await render(<Cover images={images.slice(0, 1)} shape="square" size={layout.heroCover} />);
    expect(screen.getByTestId("cover-single").props.source).toEqual({ uri: "test://img/1/l" });
  });

  it("draws each mosaic cell of a hero cover at the medium tier", async () => {
    await render(<Cover images={images} shape="square" size={layout.heroCover} />);
    const sources = nodesWithProp(screen.toJSON(), "source").map((node) => node.props.source);
    expect(sources).toEqual(images.map((image) => ({ uri: image.medium })));
  });

  it("draws each mosaic cell of a row at the small tier", async () => {
    await render(<Cover images={images} shape="square" size={layout.rowCover} />);
    const sources = nodesWithProp(screen.toJSON(), "source").map((node) => node.props.source);
    expect(sources).toEqual(images.map((image) => ({ uri: image.small })));
  });

  it("draws the placeholder with no images", async () => {
    await render(<Cover images={[]} shape="square" />);
    expect(screen.getByTestId("cover-placeholder")).toBeTruthy();
    expect(nodesWithProp(screen.toJSON(), "source")).toHaveLength(0);
  });

  it("draws the accent tile with its icon instead of images when given an icon", async () => {
    await render(<Cover images={images} shape="square" icon="heart" />);
    const tile = screen.getByTestId("cover-tile");
    expect(tile.props.style).toEqual(
      expect.objectContaining({ backgroundColor: color.accent.primary }),
    );
    expect(nodesWithProp(screen.toJSON(), "source")).toHaveLength(0);
    expect(screen.queryByTestId("cover-mosaic")).toBeNull();
  });

  it("rounds the box for the round shape", async () => {
    await render(<Cover images={[]} shape="round" />);
    const box = screen.getByTestId("cover-placeholder").parent;
    expect(box?.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ borderRadius: radius.full })]),
    );
  });

  it("uses the small corner on a square by default and the medium one when asked", async () => {
    const view = await render(<Cover images={[]} shape="square" />);
    const corner = (): unknown => screen.getByTestId("cover-placeholder").parent?.props.style;
    expect(corner()).toEqual(
      expect.arrayContaining([expect.objectContaining({ borderRadius: radius.sm })]),
    );
    await view.rerender(<Cover images={[]} shape="square" corner="md" />);
    expect(corner()).toEqual(
      expect.arrayContaining([expect.objectContaining({ borderRadius: radius.md })]),
    );
  });

  it("sizes the box and the mosaic cells from size", async () => {
    await render(<Cover images={images} shape="square" size={100} />);
    const box = screen.getByTestId("cover-mosaic").parent;
    expect(box?.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: 100, height: 100 })]),
    );
    const [cell] = nodesWithProp(screen.toJSON(), "source");
    expect(cell?.props.style).toEqual({ width: 50, height: 50 });
  });

  it("defaults to the carousel card size", async () => {
    await render(<Cover images={[]} shape="square" />);
    const box = screen.getByTestId("cover-placeholder").parent;
    expect(box?.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ width: layout.carouselCard, height: layout.carouselCard }),
      ]),
    );
  });
});

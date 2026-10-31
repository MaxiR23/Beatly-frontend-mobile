// packages/ui/test/components/Carousel.test.tsx
//
// Tests for the Carousel.
//
// Tested:
// - Carousel
//
// What is covered:
// - each card's cover keyed by its item's image URL
// - an item's onPress called and exposed as a button, an item without onPress non-pressable
// - the lead header (a round seed photo and an overline above the title), the plain header without it, and an item's centered text
//
// Run with: pnpm --filter @beatly/ui test -- Carousel
//
// SEE: packages/ui/src/components/Carousel.tsx

import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, within } from "@testing-library/react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { Carousel } from "../../src/components/Carousel.tsx";
import { radius } from "../../src/tokens/radius.ts";
import { layout } from "../../src/tokens/spacing.ts";
import { flatStyle } from "../helpers/flatStyle.ts";

describe("Carousel", () => {
  it("draws a card's cover at the medium tier", async () => {
    const image = { small: "test://img/1/s", medium: "test://img/1/m", large: "test://img/1/l" };
    await render(
      <Carousel
        title="Section"
        items={[{ key: "a", title: "First", images: [image], shape: "square" }]}
      />,
    );
    expect(screen.getByTestId("cover-single").props.source).toEqual([{ uri: "test://img/1/m" }]);
  });

  it("keys each card's image by its item's image URL", async () => {
    const tier = (n: string) => ({
      small: `test://img/${n}/s`,
      medium: `test://img/${n}/m`,
      large: `test://img/${n}/l`,
    });
    await render(
      <Carousel
        title="Section"
        items={[
          { key: "a", title: "First", images: [tier("1")], shape: "square" },
          { key: "b", title: "Second", images: [tier("2")], shape: "square" },
        ]}
      />,
    );
    const keys = screen
      .getAllByTestId("cover-single")
      .map((node): unknown => node.props.recyclingKey);
    expect(keys).toEqual(["test://img/1/m", "test://img/2/m"]);
  });

  it("calls an item's onPress and exposes it as a button", async () => {
    const onPress = jest.fn();
    await render(
      <Carousel
        title="Section"
        items={[{ key: "a", title: "First", images: [], shape: "square", onPress }]}
      />,
    );
    await fireEvent.press(screen.getByRole("button", { name: "First" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("keeps an item without onPress non-pressable", async () => {
    await render(
      <Carousel
        title="Section"
        items={[{ key: "a", title: "First", images: [], shape: "square" }]}
      />,
    );
    expect(screen.getByText("First")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("draws the lead header: a round photo, the overline above the title", async () => {
    const image = { small: "test://img/1/s", medium: "test://img/1/m", large: "test://img/1/l" };
    await render(
      <Carousel
        testID="s"
        title="Seed Name"
        lead={{ images: [image], overline: "More like" }}
        items={[{ key: "a", title: "First", images: [], shape: "square" }]}
      />,
    );
    const lead = within(screen.getByTestId("s-lead"));
    expect(lead.getByText("More like")).toBeTruthy();
    expect(lead.getByText("Seed Name")).toBeTruthy();
    const box = flatStyle(
      lead.getByTestId("cover-single").parent?.props.style as StyleProp<ViewStyle>,
    );
    expect(box).toEqual(
      expect.objectContaining({
        borderRadius: radius.full,
        width: layout.seedAvatar,
        height: layout.seedAvatar,
      }),
    );
    const texts = lead.getAllByText(/./).map((node): unknown => node.props.children);
    expect(texts.indexOf("More like")).toBeLessThan(texts.indexOf("Seed Name"));
  });

  it("draws the plain title header without a lead", async () => {
    await render(
      <Carousel
        testID="s"
        title="Section"
        items={[{ key: "a", title: "First", images: [], shape: "square" }]}
      />,
    );
    expect(screen.getByText("Section")).toBeTruthy();
    expect(screen.queryByTestId("s-lead")).toBeNull();
  });

  it("centers an item's title and subtitle when its align is center, left by default", async () => {
    await render(
      <Carousel
        title="Section"
        items={[
          {
            key: "a",
            title: "Centered",
            subtitle: "Sub c",
            images: [],
            shape: "round",
            align: "center",
          },
          { key: "b", title: "Plain", subtitle: "Sub p", images: [], shape: "round" },
        ]}
      />,
    );
    for (const name of ["Centered", "Sub c"]) {
      expect(flatStyle(screen.getByText(name).props.style)).toEqual(
        expect.objectContaining({ textAlign: "center" }),
      );
    }
    for (const name of ["Plain", "Sub p"]) {
      expect(flatStyle(screen.getByText(name).props.style)).toEqual(
        expect.objectContaining({ textAlign: "left" }),
      );
    }
  });
});

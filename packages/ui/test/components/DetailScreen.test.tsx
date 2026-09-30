// packages/ui/test/components/DetailScreen.test.tsx
//
// Tests for the DetailScreen base.
//
// Tested:
// - DetailScreen
//
// What is covered:
// - the rows under the children, onEndReached, the mosaic and the tile covers
// - the four bodies: the skeleton, the error with retry, the unavailable message, the ready hero with its title and children
// - the hero title in typography.title
// - the image hero: full width at the hero image ratio, the title over it in typography.display, the fade, the placeholder without an image, no centered cover or wash
// - the floating back button, the more button only when given, the neutral wash and the gradient wash
//
// Run with: pnpm --filter @beatly/ui test -- DetailScreen
//
// SEE: packages/ui/src/components/DetailScreen.tsx

import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, within } from "@testing-library/react-native";
import { Dimensions, StyleSheet, Text, type TextStyle, type ViewStyle } from "react-native";

import { color } from "../../src/tokens/color.ts";
import { layout } from "../../src/tokens/spacing.ts";
import { typography } from "../../src/tokens/typography.ts";
import { DetailScreen, type DetailBody } from "../../src/components/DetailScreen.tsx";

const ready = (washColor: string | null = null): DetailBody => ({
  kind: "ready",
  title: "Album title",
  cover: { urls: ["test://img/cover"] },
  washColor,
  children: <Text>body content</Text>,
});

async function draw(
  body: DetailBody,
  extra: { onBack?: () => void; more?: { label: string; onPress: () => void } } = {},
) {
  await render(
    <DetailScreen
      body={body}
      backLabel="Back"
      onBack={extra.onBack ?? (() => undefined)}
      {...(extra.more ? { more: extra.more } : {})}
      topInset={0}
      bottomInset={0}
      testID="detail"
    />,
  );
}

describe("DetailScreen", () => {
  it("draws the skeleton and the back button while loading", async () => {
    await draw({ kind: "loading", label: "Loading" });
    expect(screen.getByTestId("detail-skeleton")).toBeTruthy();
    expect(screen.getByLabelText("Loading")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Back" })).toBeTruthy();
  });

  it("draws the image skeleton while loading with the image hero", async () => {
    await draw({ kind: "loading", label: "Loading", hero: "image" });
    expect(screen.getByTestId("detail-skeleton")).toBeTruthy();
    expect(screen.getByTestId("detail-skeleton-image")).toBeTruthy();
    const style = StyleSheet.flatten(
      screen.getByTestId("detail-skeleton-image").props.style as ViewStyle,
    );
    expect(style.aspectRatio).toBe(layout.heroImageRatio);
    expect(style.maxHeight).toBe(Dimensions.get("window").height * layout.heroImageMaxHeightShare);
    expect(screen.getByRole("button", { name: "Back" })).toBeTruthy();
  });

  it("draws the cover skeleton, without the image block, by default", async () => {
    await draw({ kind: "loading", label: "Loading" });
    expect(screen.queryByTestId("detail-skeleton-image")).toBeNull();
  });

  it("draws the error with retry and calls onRetry", async () => {
    const onRetry = jest.fn();
    await draw({ kind: "error", message: "Went wrong", retryLabel: "Retry", onRetry });
    expect(screen.getByText("Went wrong")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Back" })).toBeTruthy();
  });

  it("draws the unavailable message without retry", async () => {
    await draw({ kind: "unavailable", message: "Not available" });
    expect(screen.getByText("Not available")).toBeTruthy();
    expect(screen.queryByText("Retry")).toBeNull();
  });

  it("draws the title, the cover and children when ready", async () => {
    await draw(ready());
    expect(screen.getByText("Album title")).toBeTruthy();
    expect(screen.getByTestId("cover-single")).toBeTruthy();
    expect(screen.getByText("body content")).toBeTruthy();
  });

  it("draws the rows under the children when ready", async () => {
    await draw({
      ...(ready() as Extract<DetailBody, { kind: "ready" }>),
      rows: [
        { key: "a", element: <Text>row a</Text> },
        { key: "b", element: <Text>row b</Text> },
      ],
    });
    expect(screen.getByText("body content")).toBeTruthy();
    expect(screen.getByText("row a")).toBeTruthy();
    expect(screen.getByText("row b")).toBeTruthy();
  });

  it("calls onEndReached at the end of the list", async () => {
    const onEndReached = jest.fn();
    await draw({
      ...(ready() as Extract<DetailBody, { kind: "ready" }>),
      rows: [{ key: "a", element: <Text>row a</Text> }],
      onEndReached,
    });
    await fireEvent(screen.getByTestId("detail-list"), "onEndReached");
    expect(onEndReached).toHaveBeenCalledTimes(1);
  });

  it("draws a mosaic cover with four urls", async () => {
    await draw({
      ...(ready() as Extract<DetailBody, { kind: "ready" }>),
      cover: { urls: ["a", "b", "c", "d"].map((n) => `test://img/${n}`) },
    });
    expect(screen.getByTestId("cover-mosaic")).toBeTruthy();
  });

  it("draws the accent tile with an icon cover", async () => {
    await draw({
      ...(ready() as Extract<DetailBody, { kind: "ready" }>),
      cover: { urls: [], icon: "heart" },
    });
    expect(screen.getByTestId("cover-tile")).toBeTruthy();
  });

  it("calls onBack from the floating back button", async () => {
    const onBack = jest.fn();
    await draw(ready(), { onBack });
    await fireEvent.press(screen.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("keeps the floating buttons over the hero in every body", async () => {
    await draw(ready(), { more: { label: "More", onPress: () => undefined } });
    expect(screen.getByRole("button", { name: "Back" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "More" })).toBeTruthy();
  });

  it("draws the more button only when given one", async () => {
    await draw(ready());
    expect(screen.queryByRole("button", { name: "More" })).toBeNull();
  });

  it("draws the more button and calls its handler when given one", async () => {
    const onPress = jest.fn();
    await draw(ready(), { more: { label: "More", onPress } });
    await fireEvent.press(screen.getByRole("button", { name: "More" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("draws a neutral wash without a color and the gradient with one", async () => {
    await draw(ready());
    expect(screen.getByTestId("detail-wash-neutral")).toBeTruthy();
    expect(screen.queryByTestId("detail-wash-color")).toBeNull();
  });

  it("draws the gradient wash when it has a color", async () => {
    await draw(ready("#336699"));
    expect(screen.getByTestId("detail-wash-color")).toBeTruthy();
    expect(screen.queryByTestId("detail-wash-neutral")).toBeNull();
  });

  it("draws the hero title in the title role", async () => {
    await draw(ready());
    const sizes = screen
      .getAllByText("Album title")
      .map((node) => StyleSheet.flatten(node.props.style as TextStyle).fontSize);
    expect(sizes).toContain(typography.title.fontSize);
    expect(sizes).not.toContain(typography.display.fontSize);
  });

  describe("image hero", () => {
    const imageHero = (urls: string[] = ["test://img/artist"]): DetailBody => ({
      kind: "ready",
      hero: "image",
      title: "Artist name",
      cover: { urls },
      washColor: null,
      children: <Text>body content</Text>,
    });

    it("draws the image hero stretched to the full width at the hero image ratio", async () => {
      await draw(imageHero());
      const style = StyleSheet.flatten(
        screen.getByTestId("detail-hero-image").props.style as ViewStyle,
      );
      expect(style.alignSelf).toBe("stretch");
      expect(style.aspectRatio).toBe(layout.heroImageRatio);
      expect(style.maxHeight).toBe(
        Dimensions.get("window").height * layout.heroImageMaxHeightShare,
      );
      expect(screen.getByTestId("detail-hero-photo").props.resizeMode).toBe("cover");
      expect(screen.getByTestId("detail-hero-photo").props.source).toEqual({
        uri: "test://img/artist",
      });
    });

    it("draws the title over the image in the display role", async () => {
      await draw(imageHero());
      const title = within(screen.getByTestId("detail-hero-image")).getByText("Artist name");
      const size = StyleSheet.flatten(title.props.style as TextStyle).fontSize;
      expect(size).toBe(typography.display.fontSize);
      expect(size).not.toBe(typography.title.fontSize);
    });

    it("fades the image into the base surface", async () => {
      await draw(imageHero());
      expect(screen.getByTestId("detail-hero-fade")).toBeTruthy();
    });

    it("draws the image hero on the placeholder surface when there is no image", async () => {
      await draw(imageHero([]));
      expect(screen.queryByTestId("detail-hero-photo")).toBeNull();
      const style = StyleSheet.flatten(
        screen.getByTestId("detail-hero-image").props.style as ViewStyle,
      );
      expect(style.backgroundColor).toBe(color.surface.card);
    });

    it("does not draw the centered cover or the wash in the image hero", async () => {
      await draw(imageHero());
      expect(screen.queryByTestId("cover-single")).toBeNull();
      expect(screen.queryByTestId("detail-wash-neutral")).toBeNull();
      expect(screen.queryByTestId("detail-wash-color")).toBeNull();
    });
  });
});

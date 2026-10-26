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
// - the next-page footer of skeleton rows, its count and label, none without it, the end-reached threshold, the loading skeleton's row count
// - the slot after the rows: under the rows and after the next-page skeleton, none without it, drawn with no rows
// - the hero title in typography.title
// - the image hero: full width at the hero image ratio, the title over it in typography.display, the fade, the placeholder without an image, no centered cover or wash
// - the back and more glyphs of each platform on the floating buttons and the top bar
// - the floating back button, the more button only when given, the neutral wash and the gradient wash
// - the collapse: one Animated.event on the native driver, the cover's shrink and fade, the order of the fades on both heroes, ranges from the measured heights, the touches handed from the floating buttons to the top bar and back, the bar's geometry and fill, no cover scale under reduce motion, static until measured, the other bodies unchanged, the reset when the ready body leaves
//
// - the entry cascade: five steps (hero, title, children, the first motion.detailCascade.firstRows rows, the later rows) in that order with the motion.detailCascade tokens on the native driver, opacity and translateY only, at once from loading and after navigationDelay when ready at mount, once per mount, late rows at rest, the slot after the rows in the later rows step under exactly one cascade wrapper and at rest when it arrives late, reduce motion at mount and turning on mid-way, unmount stopping it, the floating buttons never under a cascade wrapper on iOS and Android, no wrapper in the other bodies, the collapse's layers untouched by it
//
// - the iOS blur under the strip: absent before the measure, on Android and in the other bodies; mounted once measured whatever the phase, invisible at the top (mask opacity 0), between the list and the strip, at the strip's box, out of touches; the token's intensity and tint; masked by the blurMask stops on the base surface; the mask's opacity the strip's at every offset, also under reduce motion; no opacity on any parent of the blur
// - the collapse cases run on Android; on iOS: the floating back fixed, opaque, touchable and announced in every phase and drawn above the bar, the strip's height from the back's tokens plus spacing.sm, no background, its wash stops from the dominant color or the base surface and its shade stops, both from the tokens and transparent at the bottom edge, the title between two control-height slots at the back's vertical center, the mores handed over by the phase, the other bodies
//
// Run with: pnpm --filter @beatly/ui test -- DetailScreen
//
// SEE: packages/ui/src/components/DetailScreen.tsx

import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen, within } from "@testing-library/react-native";
import {
  Animated,
  Dimensions,
  Platform,
  processColor,
  StyleSheet,
  Text,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { blur } from "../../src/tokens/blur.ts";
import { color } from "../../src/tokens/color.ts";
import { motion } from "../../src/tokens/motion.ts";
import { layout, spacing } from "../../src/tokens/spacing.ts";
import { typography } from "../../src/tokens/typography.ts";
import { DetailScreen, type DetailBody } from "../../src/components/DetailScreen.tsx";
import { collapseRanges } from "../../src/components/detailCollapse.ts";

const tiers = (n: string) => ({
  small: `test://img/${n}/s`,
  medium: `test://img/${n}/m`,
  large: `test://img/${n}/l`,
});

const ready = (washColor: string | null = null): DetailBody => ({
  kind: "ready",
  title: "Album title",
  cover: { images: [tiers("cover")] },
  washColor,
  children: <Text>body content</Text>,
});

interface DrawExtra {
  onBack?: () => void;
  more?: { label: string; onPress: () => void };
  reduceMotion?: boolean;
  topInset?: number;
}

function element(body: DetailBody, extra: DrawExtra = {}) {
  return (
    <DetailScreen
      body={body}
      backLabel="Back"
      onBack={extra.onBack ?? (() => undefined)}
      {...(extra.more ? { more: extra.more } : {})}
      topInset={extra.topInset ?? 0}
      bottomInset={0}
      testID="detail"
      reduceMotion={extra.reduceMotion ?? false}
    />
  );
}

async function draw(body: DetailBody, extra: DrawExtra = {}) {
  return render(element(body, extra));
}

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

// How many drawn glyphs carry the whole lucide class token.
function glyphCount(name: string): number {
  return svgRoots(screen.toJSON()).filter((node) =>
    String(node.props.className).split(/\s+/).includes(`lucide-${name}`),
  ).length;
}

function fail(): never {
  throw new Error("expected ranges");
}

describe("DetailScreen", () => {
  describe("platform glyphs", () => {
    afterEach(() => {
      Platform.OS = "ios";
    });

    it.each(["ios", "android"] as const)(
      "draws the back and more glyphs of %s on the floating buttons and the top bar",
      async (platform) => {
        Platform.OS = platform;
        await draw(ready(), { more: { label: "More", onPress: () => undefined } });
        const android = platform === "android";
        expect(glyphCount("arrow-left")).toBe(android ? 2 : 0);
        expect(glyphCount("ellipsis-vertical")).toBe(android ? 2 : 0);
        expect(glyphCount("chevron-left")).toBe(android ? 0 : 1);
        expect(glyphCount("ellipsis")).toBe(android ? 0 : 2);
      },
    );
  });

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

  it("draws skeleton rows under the rows while the next page loads", async () => {
    await draw({
      ...(ready() as Extract<DetailBody, { kind: "ready" }>),
      rows: [{ key: "a", element: <Text>row a</Text> }],
      loadingMore: { label: "Loading more" },
    });
    const footer = screen.getByTestId("detail-loading-more");
    expect(screen.getByLabelText("Loading more")).toBeTruthy();
    expect(within(footer).getAllByTestId("detail-skeleton-row")).toHaveLength(layout.skeletonRows);
    expect(screen.getByText("row a")).toBeTruthy();
  });

  it("draws no footer when the next page is not loading", async () => {
    await draw({
      ...(ready() as Extract<DetailBody, { kind: "ready" }>),
      rows: [{ key: "a", element: <Text>row a</Text> }],
    });
    expect(screen.queryByTestId("detail-loading-more")).toBeNull();
    expect(screen.queryAllByTestId("detail-skeleton-row")).toHaveLength(0);
  });

  it("draws the slot after the rows", async () => {
    await draw({
      ...(ready() as Extract<DetailBody, { kind: "ready" }>),
      rows: [
        { key: "a", element: <Text>row a</Text> },
        { key: "b", element: <Text>row b</Text> },
      ],
      afterRows: <Text>after content</Text>,
    });
    expect(screen.getByText("after content")).toBeTruthy();
    expect(
      screen
        .queryAllByTestId(/^detail-cascade-(row-a|row-b|after-rows)$/)
        .map((node) => node.props.testID as string),
    ).toEqual(["detail-cascade-row-a", "detail-cascade-row-b", "detail-cascade-after-rows"]);
  });

  it("draws the slot after the next-page skeleton", async () => {
    await draw({
      ...(ready() as Extract<DetailBody, { kind: "ready" }>),
      rows: [{ key: "a", element: <Text>row a</Text> }],
      loadingMore: { label: "Loading more" },
      afterRows: <Text>after content</Text>,
    });
    expect(
      screen
        .queryAllByTestId(/^(detail-loading-more|detail-cascade-after-rows)$/)
        .map((node) => node.props.testID as string),
    ).toEqual(["detail-loading-more", "detail-cascade-after-rows"]);
    expect(
      within(screen.getByTestId("detail-loading-more")).getAllByTestId("detail-skeleton-row"),
    ).toHaveLength(layout.skeletonRows);
  });

  it("draws no slot without one", async () => {
    const view = await draw({
      ...(ready() as Extract<DetailBody, { kind: "ready" }>),
      rows: [{ key: "a", element: <Text>row a</Text> }],
    });
    expect(screen.queryByTestId("detail-cascade-after-rows")).toBeNull();
    await view.rerender(
      element({
        ...(ready() as Extract<DetailBody, { kind: "ready" }>),
        rows: [{ key: "a", element: <Text>row a</Text> }],
        loadingMore: { label: "Loading more" },
      }),
    );
    expect(screen.queryByTestId("detail-cascade-after-rows")).toBeNull();
    expect(screen.getByLabelText("Loading more")).toBeTruthy();
    expect(
      within(screen.getByTestId("detail-loading-more")).getAllByTestId("detail-skeleton-row"),
    ).toHaveLength(layout.skeletonRows);
  });

  it("draws the slot with no rows", async () => {
    await draw({
      ...(ready() as Extract<DetailBody, { kind: "ready" }>),
      afterRows: <Text>after content</Text>,
    });
    expect(screen.getByText("body content")).toBeTruthy();
    expect(screen.getByText("after content")).toBeTruthy();
  });

  it("asks for the next page two screens before the end", async () => {
    await draw({
      ...(ready() as Extract<DetailBody, { kind: "ready" }>),
      rows: [{ key: "a", element: <Text>row a</Text> }],
    });
    expect(screen.getByTestId("detail-list").props.onEndReachedThreshold).toBe(2);
  });

  it("draws the token's count of rows in the loading skeleton", async () => {
    await draw({ kind: "loading", label: "Loading" });
    expect(screen.getAllByTestId("detail-skeleton-row")).toHaveLength(layout.skeletonRows);
    expect(layout.skeletonRows).toBe(6);
  });

  it("draws a mosaic cover with four images, each cell at the medium tier", async () => {
    await draw({
      ...(ready() as Extract<DetailBody, { kind: "ready" }>),
      cover: { images: ["a", "b", "c", "d"].map(tiers) },
    });
    expect(screen.getByTestId("cover-mosaic")).toBeTruthy();
    const cells = screen.getByTestId("cover-mosaic").props.children as {
      props: { source: unknown };
    }[];
    expect(cells.map((cell) => cell.props.source)).toEqual(
      ["a", "b", "c", "d"].map((n) => ({ uri: `test://img/${n}/m` })),
    );
  });

  it("draws the hero cover at the large tier", async () => {
    await draw(ready());
    expect(screen.getByTestId("cover-single").props.source).toEqual({ uri: "test://img/cover/l" });
  });

  it("draws the accent tile with an icon cover", async () => {
    await draw({
      ...(ready() as Extract<DetailBody, { kind: "ready" }>),
      cover: { images: [], icon: "heart" },
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
    const imageHero = (images = [tiers("artist")]): DetailBody => ({
      kind: "ready",
      hero: "image",
      title: "Artist name",
      cover: { images },
      washColor: null,
      children: <Text>body content</Text>,
    });

    it("draws the image hero at the large tier, stretched to the full width at the hero image ratio", async () => {
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
        uri: "test://img/artist/l",
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
        screen.getByTestId("detail-cascade-hero").props.style as ViewStyle,
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

  describe("collapse", () => {
    const hidden = { includeHiddenElements: true } as const;
    const imageBody: DetailBody = {
      kind: "ready",
      hero: "image",
      title: "Artist name",
      cover: { images: [] },
      washColor: null,
      children: <Text>body content</Text>,
    };
    const HERO = 400;
    const TITLE = 50;
    const layoutEvent = (height: number) => ({
      nativeEvent: { layout: { x: 0, y: 0, width: 390, height } },
    });
    let eventSpy: { mock: { calls: unknown[][] }; mockRestore: () => void } | undefined;

    beforeEach(() => {
      Platform.OS = "android";
    });

    afterEach(() => {
      eventSpy?.mockRestore();
      eventSpy = undefined;
      Platform.OS = "ios";
    });

    // Draws, captures the scroll value and returns helpers to measure and scroll.
    async function setup(
      body: DetailBody,
      extra: DrawExtra = {},
      measured: { hero?: number; title?: number } = { hero: HERO, title: TITLE },
    ) {
      const spy = jest.spyOn(Animated, "event");
      eventSpy = spy;
      const view = await draw(body, extra);
      const mapping = spy.mock.calls[0]?.[0] as [
        { nativeEvent: { contentOffset: { y: Animated.Value } } },
      ];
      const value = mapping[0].nativeEvent.contentOffset.y;
      const heroId =
        body.kind === "ready" && body.hero === "image" ? "detail-hero-image" : "detail-hero";
      if (measured.hero !== undefined)
        await fireEvent(screen.getByTestId(heroId), "layout", layoutEvent(measured.hero));
      if (measured.title !== undefined && body.kind === "ready" && body.hero !== "image")
        await fireEvent(screen.getByTestId("detail-title"), "layout", layoutEvent(measured.title));
      const scrollTo = async (y: number) => {
        await act(() => {
          value.setValue(y);
        });
        await view.rerender(element(body, extra));
      };
      const scrollEvent = async (y: number) => {
        await fireEvent.scroll(screen.getByTestId("detail-list"), {
          nativeEvent: { contentOffset: { x: 0, y } },
        });
      };
      return { view, value, scrollTo, scrollEvent };
    }

    const ranges = (hero: "cover" | "image", h = HERO, t: number | null = TITLE, inset = 0) =>
      collapseRanges({ hero, heroHeight: h, titleHeight: t, topInset: inset }) ?? fail();
    const mid = (r: readonly [number, number]) => (r[0] + r[1]) / 2;
    const opacityOf = (id: string) =>
      StyleSheet.flatten(screen.getByTestId(id, hidden).props.style as ViewStyle).opacity;

    it("draws the top bar hidden and untouchable at the top, the floating buttons active", async () => {
      await setup(ready());
      const bar = screen.getByTestId("detail-top-bar", hidden);
      expect(StyleSheet.flatten(bar.props.style as ViewStyle).opacity).toBe(0);
      expect(bar.props.pointerEvents).toBe("none");
      expect(bar.props.accessibilityElementsHidden).toBe(true);
      expect(screen.getByTestId("detail-buttons", hidden).props.pointerEvents).toBe("box-none");
    });

    it("drives the scroll through one Animated.event on the native driver", async () => {
      await setup(ready());
      expect(eventSpy?.mock.calls).toHaveLength(1);
      const [mapping, config] = eventSpy?.mock.calls[0] ?? [];
      expect(config).toMatchObject({ useNativeDriver: true });
      expect(
        (mapping as { nativeEvent: { contentOffset: { y: unknown } } }[])[0]?.nativeEvent
          .contentOffset.y,
      ).toBeInstanceOf(Animated.Value);
      const list = screen.getByTestId("detail-list");
      expect(list.props.onScroll).toBeDefined();
      expect(list.props.scrollEventThrottle).toBe(16);
    });

    it("changes the touch state only when the phase changes", async () => {
      const { scrollEvent } = await setup(ready());
      const r = ranges("cover");
      const snapshot = (): unknown[] => [
        screen.getByTestId("detail-buttons", hidden).props.pointerEvents,
        screen.getByTestId("detail-top-bar", hidden).props.pointerEvents,
        screen.getByTestId("detail-top-bar", hidden).props.accessibilityElementsHidden,
      ];
      const before = snapshot();
      for (let i = 0; i < 20; i++) await scrollEvent(Math.min(i, r.buttons[1] - 1));
      expect(snapshot()).toEqual(before);
      await scrollEvent(r.bar[0]);
      expect(snapshot()).toEqual(["none", "auto", false]);
    });

    it("shrinks the cover to coverScale and fades it over its range", async () => {
      const { scrollTo } = await setup(ready());
      const r = ranges("cover");
      const cover = () =>
        StyleSheet.flatten(screen.getByTestId("detail-hero-cover").props.style as ViewStyle);
      expect(cover().opacity).toBe(1);
      expect(cover().transform).toEqual([{ scale: 1 }]);
      await scrollTo(r.cover[1] / 2);
      expect(cover().opacity).toBeCloseTo(0.5);
      expect(cover().transform).toEqual([
        { scale: expect.closeTo(1 - (1 - motion.detailCollapse.coverScale) / 2) },
      ]);
      await scrollTo(r.cover[1] + 100);
      expect(cover().opacity).toBe(0);
      expect(cover().transform).toEqual([
        { scale: expect.closeTo(motion.detailCollapse.coverScale) },
      ]);
    });

    it("fades the floating buttons, then the title, then brings the bar in", async () => {
      const { scrollTo } = await setup(ready());
      const r = ranges("cover");
      await scrollTo(mid(r.buttons));
      expect(opacityOf("detail-buttons")).toBeCloseTo(0.5);
      expect(opacityOf("detail-title")).toBe(1);
      expect(opacityOf("detail-top-bar")).toBe(0);
      await scrollTo(mid(r.title));
      expect(opacityOf("detail-buttons")).toBe(0);
      expect(opacityOf("detail-title")).toBeCloseTo(0.5);
      await scrollTo(mid(r.bar));
      expect(opacityOf("detail-title")).toBe(0);
      expect(opacityOf("detail-top-bar")).toBeCloseTo(0.5);
      await scrollTo(r.bar[1]);
      expect(opacityOf("detail-top-bar")).toBe(1);
    });

    it("fades the same way on the image hero", async () => {
      const { scrollTo } = await setup(imageBody, {}, { hero: HERO });
      const r = ranges("image", HERO, null);
      expect(screen.queryByTestId("detail-hero-cover")).toBeNull();
      await scrollTo(mid(r.buttons));
      expect(opacityOf("detail-buttons")).toBeCloseTo(0.5);
      expect(opacityOf("detail-hero-title")).toBe(1);
      await scrollTo(mid(r.title));
      expect(opacityOf("detail-buttons")).toBe(0);
      expect(opacityOf("detail-hero-title")).toBeCloseTo(0.5);
      await scrollTo(r.bar[1]);
      expect(opacityOf("detail-hero-title")).toBe(0);
      expect(opacityOf("detail-top-bar")).toBe(1);
    });

    it("derives the ranges from the measured heights", async () => {
      const { scrollTo } = await setup(ready());
      const taller = ranges("cover", HERO, TITLE + 30);
      await fireEvent(screen.getByTestId("detail-title"), "layout", layoutEvent(TITLE + 30));
      await scrollTo(mid(taller.title));
      expect(opacityOf("detail-title")).toBeCloseTo(0.5);
    });

    it("hands the touches from the floating buttons to the bar and back", async () => {
      const onBack = jest.fn();
      const onMore = jest.fn();
      const { scrollEvent } = await setup(ready(), {
        onBack,
        more: { label: "More", onPress: onMore },
      });
      const r = ranges("cover");
      const floating = () => screen.getByTestId("detail-buttons", hidden);
      const bar = () => screen.getByTestId("detail-top-bar", hidden);
      const press = async (root: ReturnType<typeof floating>, name: string) =>
        fireEvent.press(within(root).getByRole("button", { name, ...hidden }));

      await scrollEvent(0);
      expect(floating().props.accessibilityElementsHidden).toBe(false);
      expect(bar().props.accessibilityElementsHidden).toBe(true);
      expect(floating().props.pointerEvents).toBe("box-none");
      await press(floating(), "Back");
      expect(onBack).toHaveBeenCalledTimes(1);

      await scrollEvent(r.buttons[1]);
      if (r.buttons[1] < r.bar[0]) {
        expect(floating().props.pointerEvents).toBe("none");
        expect(bar().props.pointerEvents).toBe("none");
        expect(floating().props.accessibilityElementsHidden).toBe(true);
        expect(bar().props.accessibilityElementsHidden).toBe(true);
      }

      await scrollEvent(r.bar[0] + 5);
      expect(bar().props.pointerEvents).toBe("auto");
      expect(bar().props.accessibilityElementsHidden).toBe(false);
      expect(floating().props.pointerEvents).toBe("none");
      expect(floating().props.accessibilityElementsHidden).toBe(true);
      await press(bar(), "Back");
      await press(bar(), "More");
      expect(onBack).toHaveBeenCalledTimes(2);
      expect(onMore).toHaveBeenCalledTimes(1);

      await scrollEvent(0);
      expect(floating().props.pointerEvents).toBe("box-none");
      expect(bar().props.pointerEvents).toBe("none");
    });

    it("draws the bar from the top edge to topInset plus controlHeight", async () => {
      await setup(ready(), { topInset: 20 }, { hero: HERO, title: TITLE });
      const bar = screen.getByTestId("detail-top-bar", hidden);
      const style = StyleSheet.flatten(bar.props.style as ViewStyle);
      expect(style.height).toBe(20 + layout.controlHeight);
      expect(style.paddingTop).toBe(20);
      expect(style.top).toBe(0);
      const title = within(bar).getByText("Album title", hidden);
      expect(title.props.numberOfLines).toBe(1);
      expect(StyleSheet.flatten(title.props.style as TextStyle).fontSize).toBe(
        typography.subtitle.fontSize,
      );
    });

    it("fills the bar with the dominant color, or the base surface without one", async () => {
      await draw(ready("#336699"));
      expect(
        StyleSheet.flatten(screen.getByTestId("detail-top-bar", hidden).props.style as ViewStyle)
          .backgroundColor,
      ).toBe("#336699");
    });

    it("fills the bar with the base surface without a dominant color", async () => {
      await draw(ready());
      expect(
        StyleSheet.flatten(screen.getByTestId("detail-top-bar", hidden).props.style as ViewStyle)
          .backgroundColor,
      ).toBe(color.surface.base);
    });

    it("draws the bar's more only when given one", async () => {
      await draw(ready());
      const bar = screen.getByTestId("detail-top-bar", hidden);
      expect(within(bar).queryByRole("button", { name: "More", ...hidden })).toBeNull();
    });

    it("does not scale the cover under reduce motion", async () => {
      const { scrollTo } = await setup(ready(), { reduceMotion: true });
      const r = ranges("cover");
      await scrollTo(r.cover[1]);
      const style = StyleSheet.flatten(
        screen.getByTestId("detail-hero-cover").props.style as ViewStyle,
      );
      expect(style.transform).toBeUndefined();
      expect(style.opacity).toBe(0);
      await scrollTo(mid(r.buttons));
      expect(opacityOf("detail-buttons")).toBeCloseTo(0.5);
      await scrollTo(r.bar[1]);
      expect(opacityOf("detail-top-bar")).toBe(1);
    });

    it("draws statically until the header is measured", async () => {
      const { scrollTo, scrollEvent } = await setup(ready(), {}, {});
      await scrollTo(1000);
      await scrollEvent(1000);
      const buttons = screen.getByTestId("detail-buttons", hidden);
      expect(buttons.props.pointerEvents).toBe("box-none");
      expect(StyleSheet.flatten(buttons.props.style as ViewStyle).opacity).toBeUndefined();
      expect(screen.getByTestId("detail-top-bar", hidden).props.pointerEvents).toBe("none");
      expect(opacityOf("detail-top-bar")).toBe(0);
    });

    it("keeps the skeleton, the error and the unavailable bodies as they were", async () => {
      const bodies: DetailBody[] = [
        { kind: "loading", label: "Loading" },
        { kind: "error", message: "Went wrong", retryLabel: "Retry", onRetry: () => undefined },
        { kind: "unavailable", message: "Not available" },
      ];
      for (const body of bodies) {
        const view = await draw(body);
        expect(screen.queryByTestId("detail-top-bar", hidden)).toBeNull();
        const buttons = screen.getByTestId("detail-buttons", hidden);
        expect(buttons.props.pointerEvents).toBe("box-none");
        expect(StyleSheet.flatten(buttons.props.style as ViewStyle).opacity).toBeUndefined();
        await view.unmount();
      }
    });

    it("resets the collapse when the ready body becomes the error", async () => {
      const onBack = jest.fn();
      const { scrollEvent, view, scrollTo } = await setup(ready(), { onBack });
      const r = ranges("cover");
      await scrollTo(r.bar[1]);
      await scrollEvent(r.bar[0] + 5);
      const error: DetailBody = {
        kind: "error",
        message: "Went wrong",
        retryLabel: "Retry",
        onRetry: () => undefined,
      };
      await view.rerender(element(error, { onBack }));
      await fireEvent.press(screen.getByRole("button", { name: "Back" }));
      expect(onBack).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("detail-buttons", hidden).props.accessibilityElementsHidden).toBe(
        false,
      );
      await view.rerender(element(ready(), { onBack }));
      expect(
        StyleSheet.flatten(screen.getByTestId("detail-hero-cover").props.style as ViewStyle | null),
      ).toBeUndefined();
    });

    it("draws the bar's own back and no gradient on Android", async () => {
      await setup(ready("#336699"), { more: { label: "More", onPress: () => undefined } });
      const bar = screen.getByTestId("detail-top-bar", hidden);
      expect(within(bar).getByRole("button", { name: "Back", ...hidden })).toBeTruthy();
      expect(screen.queryByTestId("detail-top-bar-wash", hidden)).toBeNull();
      expect(screen.queryByTestId("detail-top-bar-shade", hidden)).toBeNull();
      expect(screen.queryByTestId("detail-top-bar-back-slot", hidden)).toBeNull();
      expect(screen.queryByTestId("detail-floating-more", hidden)).toBeNull();
      expect(StyleSheet.flatten(bar.props.style as ViewStyle).backgroundColor).toBe("#336699");
    });

    it("draws no blur on Android in any phase", async () => {
      const { scrollTo, scrollEvent } = await setup(ready(), {
        more: { label: "More", onPress: () => undefined },
      });
      const r = ranges("cover");
      for (const y of [0, mid(r.buttons), r.bar[0] + 5, r.bar[1] + 100]) {
        await scrollTo(y);
        await scrollEvent(y);
        expect(screen.queryByTestId("detail-top-bar-blur", hidden)).toBeNull();
      }
    });

    describe("on iOS", () => {
      interface JsonNode {
        props: Record<string, unknown>;
        children: unknown;
      }
      const isJsonNode = (value: unknown): value is JsonNode =>
        typeof value === "object" && value !== null && "props" in value;
      const find = (tree: unknown, match: (node: JsonNode) => boolean): JsonNode[] => {
        const found: JsonNode[] = [];
        const visit = (node: unknown) => {
          if (Array.isArray(node)) node.forEach(visit);
          if (!isJsonNode(node)) return;
          if (match(node)) found.push(node);
          visit(node.children);
        };
        visit(tree);
        return found;
      };
      const argb = (c: string) => Number(processColor(c)) | 0;
      const styleOf = (id: string): ViewStyle => {
        const style = screen.getByTestId(id, hidden).props.style as ViewStyle | undefined;
        return style ? StyleSheet.flatten(style) : {};
      };
      const gradientOf = (id: string) => {
        const [wash] = find(screen.toJSON(), (node) => node.props.testID === id);
        const [gradient] = find(wash?.children, (node) => "gradient" in node.props);
        return gradient?.props;
      };
      const stopsOf = (id: string) => {
        const flat = gradientOf(id)?.gradient;
        if (!Array.isArray(flat)) throw new Error("gradient is not an array");
        const stops: { offset: number; alpha: number; rgb: number }[] = [];
        for (let i = 0; i < flat.length; i += 2) {
          const packed = Number(flat[i + 1]);
          stops.push({
            offset: Number(flat[i]),
            alpha: (packed >>> 24) & 0xff,
            rgb: packed & 0xffffff,
          });
        }
        return stops;
      };
      const offsetsOf = (stops: readonly { offset: number }[]) => stops.map((stop) => stop.offset);
      const alphasOf = (stops: readonly { opacity: number }[]) =>
        stops.map((stop) => Math.round(stop.opacity * 255));
      const rgbOf = (c: string) => argb(c) & 0xffffff;
      const moreOf = { label: "More" };

      beforeEach(() => {
        Platform.OS = "ios";
      });

      it("keeps the floating back fixed, opaque, touchable and announced in every phase", async () => {
        const onBack = jest.fn();
        const { scrollTo, scrollEvent } = await setup(ready(), {
          onBack,
          more: { ...moreOf, onPress: () => undefined },
        });
        const r = ranges("cover");
        for (const y of [0, mid(r.buttons), r.buttons[1], r.bar[0] + 5, r.bar[1] + 100]) {
          await scrollTo(y);
          await scrollEvent(y);
          const buttons = screen.getByTestId("detail-buttons", hidden);
          expect(styleOf("detail-buttons").opacity).toBeUndefined();
          expect(buttons.props.pointerEvents).toBe("box-none");
          expect(buttons.props.accessibilityElementsHidden).toBe(false);
          expect(buttons.props.importantForAccessibility).toBe("auto");
          const back = screen.getAllByRole("button", { name: "Back" });
          expect(back).toHaveLength(1);
          await fireEvent.press(back[0] ?? fail());
        }
        expect(onBack).toHaveBeenCalledTimes(5);
      });

      it("draws the fixed back above the bar", async () => {
        const { scrollEvent } = await setup(ready(), {
          more: { ...moreOf, onPress: () => undefined },
        });
        const r = ranges("cover");
        await scrollEvent(r.bar[0] + 5);
        const ids = find(screen.toJSON(), (node) => node.props.testID === "detail")[0]?.children;
        const order = (Array.isArray(ids) ? ids : [])
          .filter(isJsonNode)
          .map((node) => node.props.testID);
        expect(order.indexOf("detail-top-bar")).toBeGreaterThanOrEqual(0);
        expect(order.indexOf("detail-top-bar")).toBeLessThan(order.indexOf("detail-buttons"));
        expect(screen.getByTestId("detail-top-bar", hidden).props.pointerEvents).toBe("auto");
        let node = screen.getAllByRole("button", { name: "Back" })[0]?.parent ?? null;
        while (node && node.props.testID !== "detail-buttons") {
          expect(node.props.pointerEvents).not.toBe("none");
          node = node.parent;
        }
        expect(node).not.toBeNull();
      });

      it("draws no back of its own in the bar, a slot of the back's width instead", async () => {
        await setup(ready());
        const bar = screen.getByTestId("detail-top-bar", hidden);
        expect(within(bar).queryByRole("button", { name: "Back", ...hidden })).toBeNull();
        expect(styleOf("detail-top-bar-back-slot").width).toBe(layout.controlHeight);
        expect(styleOf("detail-top-bar").paddingHorizontal).toBe(layout.gutter);
        expect(styleOf("detail-buttons").left).toBe(layout.gutter);
        const title = within(bar).getByText("Album title", hidden);
        expect(title.props.numberOfLines).toBe(1);
        const titleStyle = StyleSheet.flatten(title.props.style as TextStyle);
        expect(titleStyle.fontSize).toBe(typography.subtitle.fontSize);
        expect(titleStyle.textAlign).toBe("center");
        let parent = title.parent;
        while (
          parent &&
          (parent.props.style ? StyleSheet.flatten(parent.props.style as ViewStyle) : {}).flex !== 1
        ) {
          parent = parent.parent;
        }
        expect(parent).not.toBeNull();
        const row = screen.getByTestId("detail-top-bar-back-slot", hidden).parent;
        const last = find(row?.children, () => true).at(-1);
        expect(StyleSheet.flatten(last?.props.style as ViewStyle).width).toBe(layout.controlHeight);
      });

      it("reaches from the top edge to spacing.sm past spacing.xs under the back and centers the title with it", async () => {
        await setup(ready(), { topInset: 47 });
        const bar = styleOf("detail-top-bar");
        const buttons = styleOf("detail-buttons");
        const backBottom = (buttons.top as number) + layout.controlHeight;
        expect(buttons.top).toBe(47 + spacing.xs);
        expect(bar.height).toBe(backBottom + spacing.xs + spacing.sm);
        const slot = screen.getByTestId("detail-top-bar-back-slot", hidden);
        const row = StyleSheet.flatten(slot.parent?.props.style as ViewStyle);
        expect(row.height).toBe(layout.controlHeight);
        expect(row.alignItems).toBe("center");
        // The row starts at the bar's padding, so its center is the back's center.
        expect((bar.paddingTop as number) + layout.controlHeight / 2).toBe(
          (buttons.top as number) + layout.controlHeight / 2,
        );
      });

      it("fades the strip in over the bar's range", async () => {
        const { scrollTo } = await setup(ready());
        const r = ranges("cover");
        expect(opacityOf("detail-top-bar")).toBe(0);
        await scrollTo(mid(r.bar));
        expect(opacityOf("detail-top-bar")).toBeCloseTo(0.5);
        await scrollTo(r.bar[1]);
        expect(opacityOf("detail-top-bar")).toBe(1);
      });

      it("fades the dominant color to transparent at the wash stops, with no background", async () => {
        await setup(ready("#336699"));
        expect(styleOf("detail-top-bar").backgroundColor).toBeUndefined();
        const wash = color.gradient.detailStrip.wash;
        const stops = stopsOf("detail-top-bar-wash");
        expect(stops.map((stop) => stop.offset)).toEqual(offsetsOf(wash));
        expect(stops.map((stop) => stop.alpha)).toEqual(alphasOf(wash));
        expect(stops.every((stop) => stop.rgb === rgbOf("#336699"))).toBe(true);
        expect(stops.at(-1)?.alpha).toBe(0);
        expect(gradientOf("detail-top-bar-wash")).toMatchObject({ x2: "0", y2: "1" });
      });

      it("shades the strip with the base surface at the shade stops", async () => {
        await setup(ready("#336699"));
        const shade = color.gradient.detailStrip.shade;
        const stops = stopsOf("detail-top-bar-shade");
        expect(stops.map((stop) => stop.offset)).toEqual(offsetsOf(shade));
        expect(stops.map((stop) => stop.alpha)).toEqual(alphasOf(shade));
        expect(stops.every((stop) => stop.rgb === rgbOf(color.surface.base))).toBe(true);
        expect(stops[0]?.alpha).toBe(0);
        expect(stops.at(-1)?.alpha).toBe(0);
      });

      it("fades the base surface at the same wash stops without a dominant color", async () => {
        const bodies: [DetailBody, Parameters<typeof setup>[2]][] = [
          [ready(), undefined],
          [imageBody, { hero: HERO }],
        ];
        for (const [body, options] of bodies) {
          const { view } = await setup(body, {}, options);
          expect(styleOf("detail-top-bar").backgroundColor).toBeUndefined();
          const wash = color.gradient.detailStrip.wash;
          const stops = stopsOf("detail-top-bar-wash");
          expect(stops.map((stop) => stop.offset)).toEqual(offsetsOf(wash));
          expect(stops.map((stop) => stop.alpha)).toEqual(alphasOf(wash));
          expect(stops.every((stop) => stop.rgb === rgbOf(color.surface.base))).toBe(true);
          expect(screen.getByTestId("detail-top-bar-shade", hidden)).toBeTruthy();
          await view.unmount();
        }
      });

      it("keeps the layers under the row and out of touches", async () => {
        await setup(ready("#336699"));
        const bar = screen.getByTestId("detail-top-bar", hidden);
        const children = find(screen.toJSON(), (node) => node.props.testID === "detail-top-bar")[0]
          ?.children;
        const kids = (Array.isArray(children) ? children : []).filter(isJsonNode);
        expect(kids.slice(0, 2).map((node) => node.props.testID)).toEqual([
          "detail-top-bar-wash",
          "detail-top-bar-shade",
        ]);
        expect(
          find(kids[2]?.children, (node) => node.props.testID === "detail-top-bar-back-slot"),
        ).toHaveLength(1);
        expect(within(bar).getByTestId("detail-top-bar-wash", hidden).props.pointerEvents).toBe(
          "none",
        );
        expect(within(bar).getByTestId("detail-top-bar-shade", hidden).props.pointerEvents).toBe(
          "none",
        );
      });

      it("hands only the mores over, by the phase", async () => {
        const onBack = jest.fn();
        const onMore = jest.fn();
        const { scrollEvent } = await setup(ready(), {
          onBack,
          more: { ...moreOf, onPress: onMore },
        });
        const r = ranges("cover");
        const moreButtons = () => screen.queryAllByRole("button", { name: "More" });
        const floating = () => screen.getByTestId("detail-floating-more", hidden);
        const bar = () => screen.getByTestId("detail-top-bar", hidden);

        await scrollEvent(0);
        expect(floating().props.pointerEvents).toBe("box-none");
        expect(floating().props.accessibilityElementsHidden).toBe(false);
        expect(bar().props.pointerEvents).toBe("none");
        expect(bar().props.accessibilityElementsHidden).toBe(true);
        expect(moreButtons()).toHaveLength(1);
        await fireEvent.press(moreButtons()[0] ?? fail());
        expect(onMore).toHaveBeenCalledTimes(1);

        if (r.buttons[1] < r.bar[0]) {
          await scrollEvent(r.buttons[1]);
          expect(floating().props.pointerEvents).toBe("none");
          expect(floating().props.accessibilityElementsHidden).toBe(true);
          expect(bar().props.pointerEvents).toBe("none");
          expect(moreButtons()).toHaveLength(0);
          await fireEvent.press(screen.getByRole("button", { name: "Back" }));
          expect(onBack).toHaveBeenCalledTimes(1);
        }

        await scrollEvent(r.bar[0] + 5);
        expect(bar().props.pointerEvents).toBe("auto");
        expect(bar().props.accessibilityElementsHidden).toBe(false);
        expect(floating().props.pointerEvents).toBe("none");
        expect(floating().props.accessibilityElementsHidden).toBe(true);
        expect(moreButtons()).toHaveLength(1);
        await fireEvent.press(moreButtons()[0] ?? fail());
        expect(onMore).toHaveBeenCalledTimes(2);

        await scrollEvent(0);
        expect(floating().props.pointerEvents).toBe("box-none");
        expect(moreButtons()).toHaveLength(1);
      });

      it("fades the floating more over the buttons' range", async () => {
        const { scrollTo } = await setup(ready(), {
          more: { ...moreOf, onPress: () => undefined },
        });
        const r = ranges("cover");
        await scrollTo(mid(r.buttons));
        expect(opacityOf("detail-floating-more")).toBeCloseTo(0.5);
        expect(opacityOf("detail-buttons")).toBeUndefined();
        await scrollTo(r.title[0]);
        expect(opacityOf("detail-floating-more")).toBe(0);
      });

      it("draws no blur before the measure and in the other bodies", async () => {
        const unmeasured = await setup(ready(), {}, {});
        expect(screen.queryByTestId("detail-top-bar-blur", hidden)).toBeNull();
        await unmeasured.view.unmount();
        const bodies: DetailBody[] = [
          { kind: "loading", label: "Loading" },
          { kind: "error", message: "Went wrong", retryLabel: "Retry", onRetry: () => undefined },
          { kind: "unavailable", message: "Not available" },
        ];
        for (const body of bodies) {
          const view = await draw(body);
          expect(screen.queryByTestId("detail-top-bar-blur", hidden)).toBeNull();
          await view.unmount();
        }
      });

      it("keeps the blur invisible at the top and mounted whatever the phase", async () => {
        const r = ranges("cover");
        const { scrollEvent } = await setup(ready());
        expect(screen.getByTestId("detail-top-bar-blur", hidden)).toBeTruthy();
        expect(opacityOf("detail-top-bar-blur-fade")).toBe(0);
        for (const y of [0, mid(r.buttons), r.buttons[1], r.bar[1] + 100]) {
          await scrollEvent(y);
          expect(screen.getByTestId("detail-top-bar-blur", hidden)).toBeTruthy();
        }
        await scrollEvent(0);
        expect(opacityOf("detail-top-bar-blur-fade")).toBe(0);
      });

      it("draws the blur between the list and the strip", async () => {
        const { scrollEvent } = await setup(ready(), {
          more: { ...moreOf, onPress: () => undefined },
        });
        const r = ranges("cover");
        await scrollEvent(r.buttons[1]);
        const ids = find(screen.toJSON(), (node) => node.props.testID === "detail")[0]?.children;
        const order = (Array.isArray(ids) ? ids : [])
          .filter(isJsonNode)
          .map((node) => node.props.testID);
        expect(order.indexOf("detail-list")).toBeGreaterThanOrEqual(0);
        expect(order.indexOf("detail-list")).toBeLessThan(order.indexOf("detail-top-bar-blur"));
        expect(order.indexOf("detail-top-bar-blur")).toBeLessThan(order.indexOf("detail-top-bar"));
        expect(order.indexOf("detail-top-bar")).toBeLessThan(order.indexOf("detail-buttons"));
        expect(styleOf("detail-top-bar-blur")).toMatchObject({
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: styleOf("detail-top-bar").height,
        });
        expect(screen.getByTestId("detail-top-bar-blur", hidden).props.pointerEvents).toBe("none");
      });

      it("blurs at the token's intensity and tint", async () => {
        const { scrollEvent } = await setup(ready());
        await scrollEvent(ranges("cover").buttons[1]);
        const [layer] = find(
          screen.toJSON(),
          (node) => node.props.testID === "detail-top-bar-blur-view",
        );
        const [native] = find(layer?.children, (node) => "intensity" in node.props);
        expect(native?.props.intensity).toBe(blur.detailStrip.intensity);
        expect(native?.props.tint).toBe(blur.detailStrip.tint);
      });

      it("masks the blur with the blurMask stops on the base surface", async () => {
        const { scrollEvent } = await setup(ready("#336699"));
        await scrollEvent(ranges("cover").buttons[1]);
        const mask = color.gradient.detailStrip.blurMask;
        const stops = stopsOf("detail-top-bar-blur-fade");
        expect(stops.map((stop) => stop.offset)).toEqual(offsetsOf(mask));
        expect(stops.map((stop) => stop.alpha)).toEqual(alphasOf(mask));
        expect(stops.every((stop) => stop.rgb === rgbOf(color.surface.base))).toBe(true);
        expect(stops.find((stop) => stop.offset === 0.55)?.alpha).toBe(255);
        expect(stops.at(-1)?.alpha).toBe(0);
        expect(gradientOf("detail-top-bar-blur-fade")).toMatchObject({ x2: "0", y2: "1" });
        const masked = find(
          screen.toJSON(),
          (node) => node.props.testID === "detail-top-bar-blur-mask",
        )[0];
        const kids = (Array.isArray(masked?.children) ? masked.children : []).filter(isJsonNode);
        expect(
          find(kids[0]?.children, (node) => node.props.testID === "detail-top-bar-blur-fade"),
        ).toHaveLength(1);
        const later = kids.slice(1);
        expect(
          later.flatMap((node) =>
            find([node], (n) => n.props.testID === "detail-top-bar-blur-view"),
          ),
        ).toHaveLength(1);
        expect(
          find(
            find(kids, (n) => n.props.testID === "detail-top-bar-blur-fade"),
            (n) => n.props.testID === "detail-top-bar-blur-view",
          ),
        ).toHaveLength(0);
      });

      it("fades the blur's mask with the strip and never its parents", async () => {
        const { scrollTo, scrollEvent } = await setup(ready());
        const r = ranges("cover");
        for (const [y, expected] of [
          [r.bar[0] + 5, undefined],
          [mid(r.bar), 0.5],
          [r.bar[1], 1],
        ] as const) {
          await scrollTo(y);
          await scrollEvent(y);
          expect(opacityOf("detail-top-bar-blur-fade")).toBe(opacityOf("detail-top-bar"));
          if (expected !== undefined) {
            expect(opacityOf("detail-top-bar-blur-fade")).toBeCloseTo(expected);
          }
          let node = screen.getByTestId("detail-top-bar-blur-view", hidden).parent;
          while (node && node.props.testID !== "detail") {
            const style = node.props.style ? StyleSheet.flatten(node.props.style as ViewStyle) : {};
            if (node.props.testID !== "detail-top-bar-blur-fade") {
              expect(style.opacity === undefined || style.opacity === 1).toBe(true);
            }
            node = node.parent;
          }
          expect(node).not.toBeNull();
        }
      });

      it("follows the strip the same way under reduce motion", async () => {
        const { scrollTo, scrollEvent } = await setup(ready(), { reduceMotion: true });
        const r = ranges("cover");
        expect(screen.getByTestId("detail-top-bar-blur", hidden)).toBeTruthy();
        expect(opacityOf("detail-top-bar-blur-fade")).toBe(0);
        for (const y of [r.bar[0] + 5, mid(r.bar), r.bar[1]]) {
          await scrollTo(y);
          await scrollEvent(y);
          expect(opacityOf("detail-top-bar-blur-fade")).toBe(opacityOf("detail-top-bar"));
        }
        expect(opacityOf("detail-top-bar-blur-fade")).toBe(1);
      });

      it("keeps the other bodies as they were on iOS", async () => {
        const bodies: DetailBody[] = [
          { kind: "loading", label: "Loading" },
          { kind: "error", message: "Went wrong", retryLabel: "Retry", onRetry: () => undefined },
          { kind: "unavailable", message: "Not available" },
        ];
        for (const body of bodies) {
          const view = await draw(body, { more: { ...moreOf, onPress: () => undefined } });
          expect(screen.queryByTestId("detail-top-bar", hidden)).toBeNull();
          const buttons = screen.getByTestId("detail-buttons", hidden);
          expect(buttons.props.pointerEvents).toBe("box-none");
          expect(buttons.props.accessibilityElementsHidden).toBe(false);
          expect(styleOf("detail-buttons").opacity).toBeUndefined();
          const more = screen.getByTestId("detail-floating-more", hidden);
          expect(more.props.pointerEvents).toBe("box-none");
          expect(more.props.accessibilityElementsHidden).toBe(false);
          expect(styleOf("detail-floating-more").opacity).toBeUndefined();
          await view.unmount();
        }
      });
    });
  });

  describe("entry cascade", () => {
    const WRAPPERS = [
      "detail-cascade-hero",
      "detail-cascade-title",
      "detail-cascade-children",
      "detail-cascade-row-r0",
      "detail-cascade-row-r3",
      "detail-cascade-after-rows",
    ];
    // Which wrapper each step drives: rows r0..r2 share the first-rows step, r3..r4 the later one.
    const STEP_WRAPPERS = [
      ["detail-cascade-hero"],
      ["detail-cascade-title"],
      ["detail-cascade-children"],
      ["detail-cascade-row-r0", "detail-cascade-row-r1", "detail-cascade-row-r2"],
      ["detail-cascade-row-r3", "detail-cascade-row-r4", "detail-cascade-after-rows"],
    ];
    const stubs: { start: jest.Mock; stop: jest.Mock }[] = [];
    let timing: jest.SpiedFunction<typeof Animated.timing>;

    const rowsBody = (count: number, hero?: "cover" | "image"): DetailBody => ({
      kind: "ready",
      ...(hero ? { hero } : {}),
      title: "Album title",
      cover: { images: [tiers("cover")] },
      washColor: null,
      children: <Text>body content</Text>,
      rows: Array.from({ length: count }, (_, i) => ({
        key: `r${String(i)}`,
        element: <Text>{`row ${String(i)}`}</Text>,
      })),
      afterRows: <Text>after content</Text>,
    });
    const at = (id: string) => StyleSheet.flatten(screen.getByTestId(id).props.style as ViewStyle);
    const translateOf = (id: string) => {
      const transform = at(id).transform as readonly { translateY: number }[];
      return transform[0]?.translateY;
    };
    const valueOf = (call: number) => timing.mock.calls[call]?.[0] as Animated.Value;
    const finishAll = async () => {
      for (let i = 0; i < 5; i += 1) {
        await act(() => {
          valueOf(i).setValue(1);
        });
      }
    };

    beforeEach(() => {
      stubs.length = 0;
      timing = jest.spyOn(Animated, "timing").mockImplementation(() => {
        const stub = { start: jest.fn(), stop: jest.fn(), reset: jest.fn() };
        stubs.push(stub);
        return stub;
      });
    });
    afterEach(() => {
      timing.mockRestore();
      Platform.OS = "ios";
    });

    it("starts at once from loading to ready, in order hero, title, children, first rows, later rows", async () => {
      const view = await draw({ kind: "loading", label: "Loading" });
      expect(timing).not.toHaveBeenCalled();
      await view.rerender(element(rowsBody(5)));
      expect(timing).toHaveBeenCalledTimes(5);
      for (let i = 0; i < 5; i += 1) {
        expect(timing.mock.calls[i]?.[1]).toEqual(
          expect.objectContaining({
            toValue: 1,
            duration: motion.detailCascade.duration,
            delay: i * motion.detailCascade.stagger,
            useNativeDriver: true,
          }),
        );
        expect(stubs[i]?.start).toHaveBeenCalledTimes(1);
      }
      for (const id of WRAPPERS) {
        expect(at(id).opacity).toBe(0);
        expect(translateOf(id)).toBe(motion.detailCascade.offset);
      }
      for (let step = 0; step < 5; step += 1) {
        await act(() => {
          valueOf(step).setValue(1);
        });
        STEP_WRAPPERS.forEach((ids, other) => {
          for (const id of ids) {
            expect(at(id).opacity).toBe(other <= step ? 1 : 0);
            expect(translateOf(id)).toBe(other <= step ? 0 : motion.detailCascade.offset);
          }
        });
      }
    });

    it("waits navigationDelay when the body is ready at mount", async () => {
      await draw(rowsBody(5));
      expect(timing).toHaveBeenCalledTimes(5);
      for (let i = 0; i < 5; i += 1) {
        expect(timing.mock.calls[i]?.[1]).toEqual(
          expect.objectContaining({
            delay: motion.detailCascade.navigationDelay + i * motion.detailCascade.stagger,
          }),
        );
      }
    });

    it("runs once per mount", async () => {
      const view = await draw(rowsBody(5));
      await view.rerender(element(rowsBody(5)));
      await view.rerender(
        element({
          kind: "error",
          message: "Went wrong",
          retryLabel: "Retry",
          onRetry: () => undefined,
        }),
      );
      await view.rerender(element(rowsBody(5)));
      expect(timing).toHaveBeenCalledTimes(5);
    });

    it("draws rows that arrive later at rest without a new run", async () => {
      const view = await draw(rowsBody(5));
      await finishAll();
      await view.rerender(element(rowsBody(8)));
      expect(at("detail-cascade-row-r7").opacity).toBe(1);
      expect(translateOf("detail-cascade-row-r7")).toBe(0);
      expect(timing).toHaveBeenCalledTimes(5);
    });

    it("puts the slot under exactly one cascade wrapper", async () => {
      await draw(rowsBody(5));
      const wrappers: string[] = [];
      let node = screen.getByText("after content").parent;
      while (node) {
        const id: unknown = node.props.testID;
        if (typeof id === "string" && id.startsWith("detail-cascade")) wrappers.push(id);
        node = node.parent;
      }
      expect(wrappers.filter((id, i) => wrappers.indexOf(id) === i)).toEqual([
        "detail-cascade-after-rows",
      ]);
    });

    it("draws a slot that arrives later at rest without a new run", async () => {
      const withoutSlot = { ...(rowsBody(5) as Extract<DetailBody, { kind: "ready" }>) };
      delete withoutSlot.afterRows;
      const view = await draw(withoutSlot);
      await finishAll();
      await view.rerender(element(rowsBody(5)));
      expect(at("detail-cascade-after-rows").opacity).toBe(1);
      expect(translateOf("detail-cascade-after-rows")).toBe(0);
      expect(timing).toHaveBeenCalledTimes(5);
    });

    it("draws everything at rest with no run under reduce motion", async () => {
      await draw(rowsBody(5), { reduceMotion: true });
      expect(timing).not.toHaveBeenCalled();
      for (const id of WRAPPERS) {
        expect(at(id).opacity).toBe(1);
        expect(translateOf(id)).toBe(0);
      }
    });

    it("stops a cascade under way and parks it at rest when reduce motion turns on", async () => {
      const view = await draw(rowsBody(5));
      await view.rerender(element(rowsBody(5), { reduceMotion: true }));
      expect(stubs).toHaveLength(5);
      for (const stub of stubs) expect(stub.stop).toHaveBeenCalled();
      for (const id of WRAPPERS) {
        expect(at(id).opacity).toBe(1);
        expect(translateOf(id)).toBe(0);
      }
      expect(timing).toHaveBeenCalledTimes(5);
    });

    it("stops the cascade on unmount", async () => {
      const view = await draw(rowsBody(5));
      await view.unmount();
      for (const stub of stubs) expect(stub.stop).toHaveBeenCalled();
    });

    it("animates only opacity and translateY", async () => {
      await draw(rowsBody(5));
      for (const id of WRAPPERS) {
        const style = at(id);
        expect(Object.keys(style).sort()).toEqual(["opacity", "transform"]);
        const transform = style.transform as readonly Record<string, number>[];
        expect(transform).toHaveLength(1);
        expect(Object.keys(transform[0] ?? {})).toEqual(["translateY"]);
      }
    });

    it.each(["ios", "android"] as const)(
      "never puts the floating buttons under a cascade wrapper on %s",
      async (os) => {
        Platform.OS = os;
        await draw(rowsBody(5), { more: { label: "More", onPress: () => undefined } });
        for (const name of ["Back", "More"]) {
          let node = screen.getAllByRole("button", { name })[0]?.parent ?? null;
          expect(node).not.toBeNull();
          while (node) {
            const id = node.props.testID as string | undefined;
            expect(id?.startsWith("detail-cascade") ?? false).toBe(false);
            const raw = node.props.style as ViewStyle | undefined;
            expect(raw ? StyleSheet.flatten(raw).opacity : undefined).not.toBe(0);
            node = node.parent;
          }
        }
      },
    );

    it("leaves the collapse's layers alone", async () => {
      await draw(rowsBody(5));
      const event = { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 200 } } };
      await fireEvent(screen.getByTestId("detail-hero"), "layout", event);
      await fireEvent(screen.getByTestId("detail-title"), "layout", event);
      expect(at("detail-hero-cover").opacity).toBe(1);
      expect(at("detail-title").opacity).toBe(1);
      expect(at("detail-cascade-hero").opacity).toBe(0);
    });

    it("draws no cascade wrapper in the loading, error and unavailable bodies", async () => {
      const bodies: DetailBody[] = [
        { kind: "loading", label: "Loading" },
        { kind: "error", message: "Went wrong", retryLabel: "Retry", onRetry: () => undefined },
        { kind: "unavailable", message: "Not available" },
      ];
      for (const body of bodies) {
        const view = await draw(body);
        expect(screen.queryAllByTestId(/^detail-cascade/)).toHaveLength(0);
        await view.unmount();
      }
    });
  });
});

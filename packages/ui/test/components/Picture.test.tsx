// packages/ui/test/components/Picture.test.tsx
//
// Tests for the Picture.
//
// Tested:
// - Picture
//
// What is covered:
// - a remote source with the memory and disk cache, no transition on iOS, a fade on Android skipped on any cache hit, and its URL as the recycling key
// - a new URL changes the recycling key
// - a bundled asset with the memory and disk cache and no recycling key
// - normal priority by default and high when asked
// - a prefetch of a cover at the tier its drawn side needs, into the memory and disk cache, and its false passed on
// - content fit cover by default and contain when asked; accessible and testID passed on
//
// Run with: pnpm --filter @beatly/ui test -- Picture
//
// SEE: packages/ui/src/components/Picture.tsx

import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import { Platform } from "react-native";

import { Picture, prefetchPicture } from "../../src/components/Picture.tsx";
import { motion } from "../../src/tokens/motion.ts";

const { Image } = jest.requireActual<{
  Image: { prefetch: (...args: unknown[]) => Promise<boolean> };
}>("expo-image");
const tiers = {
  small: "test://img/1/s",
  medium: "test://img/1/m",
  large: "test://img/1/l",
};

const fade = { duration: motion.duration.imageFade, skipOnCacheHit: "all" };

const initialOS = Platform.OS;

describe("Picture", () => {
  afterEach(() => {
    Platform.OS = initialOS;
    jest.restoreAllMocks();
  });

  it("draws a remote source with the memory and disk cache", async () => {
    await render(<Picture source={{ uri: "test://img/1/s" }} testID="picture" />);
    const host = screen.getByTestId("picture");
    expect(host.props.source).toEqual([{ uri: "test://img/1/s" }]);
    expect(host.props.cachePolicy).toBe("memory-disk");
  });

  it("draws with no transition on iOS", async () => {
    Platform.OS = "ios";
    await render(<Picture source={{ uri: "test://img/1/s" }} testID="picture" />);
    expect(screen.getByTestId("picture").props.transition ?? null).toBeNull();
  });

  it("fades only a picture loaded from the network on Android", async () => {
    Platform.OS = "android";
    await render(<Picture source={{ uri: "test://img/1/s" }} testID="picture" />);
    expect(screen.getByTestId("picture").props.transition).toEqual(fade);
  });

  it("keys a remote source by its URL", async () => {
    await render(<Picture source={{ uri: "test://img/1/s" }} testID="picture" />);
    expect(screen.getByTestId("picture").props.recyclingKey).toBe("test://img/1/s");
  });

  it("changes the key with the URL", async () => {
    const { rerender } = await render(
      <Picture source={{ uri: "test://img/1/s" }} testID="picture" />,
    );
    await rerender(<Picture source={{ uri: "test://img/2/s" }} testID="picture" />);
    expect(screen.getByTestId("picture").props.recyclingKey).toBe("test://img/2/s");
  });

  it("draws a bundled asset with the memory and disk cache and no recycling key", async () => {
    await render(<Picture source={1} testID="picture" />);
    const host = screen.getByTestId("picture");
    expect(host.props.cachePolicy).toBe("memory-disk");
    expect(host.props.recyclingKey ?? null).toBeNull();
  });

  it("fits cover by default and contain when asked", async () => {
    const { rerender } = await render(
      <Picture source={{ uri: "test://img/1/s" }} testID="picture" />,
    );
    expect(screen.getByTestId("picture").props.contentFit).toBe("cover");
    await rerender(
      <Picture source={{ uri: "test://img/1/s" }} contentFit="contain" testID="picture" />,
    );
    expect(screen.getByTestId("picture").props.contentFit).toBe("contain");
  });

  it("passes accessible on", async () => {
    await render(
      <Picture source={{ uri: "test://img/1/s" }} accessible={false} testID="picture" />,
    );
    expect(screen.getByTestId("picture").props.accessible).toBe(false);
  });

  it("loads at normal priority by default and high when asked", async () => {
    const { rerender } = await render(
      <Picture source={{ uri: "test://img/1/s" }} testID="picture" />,
    );
    expect(screen.getByTestId("picture").props.priority).toBe("normal");
    await rerender(<Picture source={{ uri: "test://img/1/s" }} priority="high" testID="picture" />);
    expect(screen.getByTestId("picture").props.priority).toBe("high");
  });

  it("prefetches a cover at the tier its drawn side needs, into the memory and disk cache", async () => {
    const prefetch = jest.spyOn(Image, "prefetch").mockResolvedValue(true);
    await expect(prefetchPicture(tiers, 354)).resolves.toBe(true);
    expect(prefetch).toHaveBeenCalledWith("test://img/1/l", { cachePolicy: "memory-disk" });
    await prefetchPicture(tiers, 40);
    expect(prefetch).toHaveBeenLastCalledWith("test://img/1/s", { cachePolicy: "memory-disk" });
  });

  it("passes a failed prefetch on as false", async () => {
    jest.spyOn(Image, "prefetch").mockResolvedValue(false);
    await expect(prefetchPicture(tiers, 354)).resolves.toBe(false);
  });
});

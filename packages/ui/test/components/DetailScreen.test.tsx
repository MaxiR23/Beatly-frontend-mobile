// packages/ui/test/components/DetailScreen.test.tsx
//
// Tests for the DetailScreen base.
//
// Tested:
// - DetailScreen
//
// What is covered:
// - the four bodies: the skeleton, the error with retry, the unavailable message, the ready hero with its title and children
// - the hero title in typography.title
// - the floating back button, the more button only when given, the neutral wash and the gradient wash
//
// Run with: pnpm --filter @beatly/ui test -- DetailScreen
//
// SEE: packages/ui/src/components/DetailScreen.tsx

import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet, Text, type TextStyle } from "react-native";

import { typography } from "../../src/tokens/typography.ts";
import { DetailScreen, type DetailBody } from "../../src/components/DetailScreen.tsx";

const ready = (washColor: string | null = null): DetailBody => ({
  kind: "ready",
  title: "Album title",
  coverUrl: "test://img/cover",
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
});

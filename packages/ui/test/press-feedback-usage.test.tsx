// packages/ui/test/press-feedback-usage.test.tsx
//
// Cross-cutting test: the 16 pressable components take their press feedback from pressFeedback.
//
// Tested:
// - ActionRow, Avatar, AvatarRow, Button, Chip, FloatingTabBar, GenreRow, IconButton, MediaCard, MediaRow, MiniPlayer, Notice, PlayButton, RecentRow, SegmentedControl, TrackRow
//
// What is covered:
// - iOS: no ripple prop on the pressable, no opacity while unpressed, motion.pressOpacity while pressed
// - Android: a foreground ripple in the expected token color, no background ripple, the clip (overflow hidden, radius.full for the round ones), no opacity
//
// Run with: pnpm --filter @beatly/ui test -- press-feedback-usage
//
// SEE: packages/ui/src/components/pressFeedback.ts

import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import {
  Animated,
  Platform,
  StyleSheet,
  processColor,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import type { ReactElement } from "react";

import { ActionRow } from "../src/components/ActionRow.tsx";
import { Avatar } from "../src/components/Avatar.tsx";
import { AvatarRow } from "../src/components/AvatarRow.tsx";
import { Button } from "../src/components/Button.tsx";
import { Chip } from "../src/components/Chip.tsx";
import { FloatingTabBar } from "../src/components/FloatingTabBar.tsx";
import { GenreRow } from "../src/components/GenreRow.tsx";
import { IconButton } from "../src/components/IconButton.tsx";
import { MediaCard } from "../src/components/MediaCard.tsx";
import { MediaRow } from "../src/components/MediaRow.tsx";
import { MiniPlayer } from "../src/components/MiniPlayer.tsx";
import { Notice } from "../src/components/Notice.tsx";
import { PlayButton } from "../src/components/PlayButton.tsx";
import { RecentRow } from "../src/components/RecentRow.tsx";
import { SegmentedControl } from "../src/components/SegmentedControl.tsx";
import { TrackRow } from "../src/components/TrackRow.tsx";
import { motion } from "../src/tokens/motion.ts";
import { spacing } from "../src/tokens/spacing.ts";
import { color } from "../src/tokens/color.ts";
import { radius } from "../src/tokens/radius.ts";

interface ReactNativeView {
  View: unknown;
}

jest.mock("expo-glass-effect", () => {
  const { View } = jest.requireActual<ReactNativeView>("react-native");
  return {
    GlassView: View,
    isLiquidGlassAvailable: () => false,
    isGlassEffectAPIAvailable: () => false,
  };
});

afterEach(() => {
  Platform.OS = "ios";
});

const noop = () => undefined;
const labels = { open: "Open", play: "Play", pause: "Pause", next: "Next" };

type PressableNode = ReturnType<typeof screen.getByTestId>;

interface Site {
  name: string;
  element: () => ReactElement;
  find: () => PressableNode;
  on: "surface" | "accent";
  shape: "rect" | "round" | "own";
  // The pressable exists on Android only.
  androidOnly?: true;
}

const sites: readonly Site[] = [
  {
    name: "ActionRow",
    element: () => <ActionRow icon="plus" label="Add" onPress={noop} />,
    find: () => screen.getByRole("button", { name: "Add" }),
    on: "surface",
    shape: "rect",
  },
  {
    name: "Avatar",
    element: () => <Avatar name="Ana" accessibilityLabel="Account" onPress={noop} />,
    find: () => screen.getByRole("button", { name: "Account" }),
    on: "surface",
    shape: "own",
  },
  {
    name: "AvatarRow",
    element: () => (
      <AvatarRow
        identity={{ name: "Ana", title: "Ana" }}
        subtitle="Profile"
        accessibilityLabel="Profile row"
        onPress={noop}
      />
    ),
    find: () => screen.getByRole("button", { name: "Profile row" }),
    on: "surface",
    shape: "rect",
  },
  {
    name: "Button primary",
    element: () => <Button label="Go" onPress={noop} />,
    find: () => screen.getByRole("button", { name: "Go" }),
    on: "accent",
    shape: "own",
  },
  {
    name: "Button secondary",
    element: () => <Button label="Go" variant="secondary" onPress={noop} />,
    find: () => screen.getByRole("button", { name: "Go" }),
    on: "surface",
    shape: "own",
  },
  {
    name: "Chip selected",
    element: () => <Chip label="Hits" selected onPress={noop} />,
    find: () => screen.getByRole("button", { name: "Hits" }),
    on: "accent",
    shape: "own",
  },
  {
    name: "FloatingTabBar",
    element: () => (
      <FloatingTabBar
        bottomInset={0}
        tabs={[{ key: "a", icon: "house", label: "Home", selected: true, onPress: noop }]}
      />
    ),
    find: () => screen.getByRole("tab", { name: "Home" }),
    on: "surface",
    shape: "own",
  },
  {
    name: "GenreRow",
    element: () => <GenreRow slug="rock" name="Rock" onPress={noop} />,
    find: () => screen.getByRole("button"),
    on: "surface",
    shape: "rect",
  },
  {
    name: "IconButton plain",
    element: () => <IconButton icon="plus" accessibilityLabel="Add" onPress={noop} />,
    find: () => screen.getByRole("button", { name: "Add" }),
    on: "surface",
    shape: "round",
  },
  {
    name: "IconButton primary",
    element: () => (
      <IconButton icon="plus" accessibilityLabel="Add" variant="primary" onPress={noop} />
    ),
    find: () => screen.getByRole("button", { name: "Add" }),
    on: "accent",
    shape: "round",
  },
  {
    name: "MediaCard",
    element: () => <MediaCard title="Card" images={[]} shape="square" onPress={noop} />,
    find: () => screen.getByRole("button"),
    on: "surface",
    shape: "rect",
  },
  {
    name: "MediaRow",
    element: () => <MediaRow title="Row" images={[]} shape="square" onPress={noop} />,
    find: () => screen.getByRole("button", { name: "Row" }),
    on: "surface",
    shape: "rect",
  },
  {
    name: "MediaRow with trailing",
    element: () => (
      <MediaRow title="Row" images={[]} shape="square" onPress={noop} trailing={null} />
    ),
    find: () => screen.getByRole("button", { name: "Row" }),
    on: "surface",
    shape: "rect",
  },
  {
    name: "MiniPlayer",
    element: () => (
      <MiniPlayer
        title="Song"
        subtitle="Artist"
        failed={false}
        image={null}
        tint={null}
        surface="bare"
        playing={false}
        reduceMotion
        busy={false}
        labels={labels}
        onOpen={noop}
        onToggle={noop}
        onNext={noop}
      />
    ),
    find: () => screen.getByRole("button", { name: "Open" }),
    on: "surface",
    shape: "round",
  },
  {
    name: "PlayButton",
    element: () => (
      <PlayButton
        state="idle"
        playLabel="Play"
        pauseLabel="Pause"
        reduceMotion
        disabled={false}
        shrink={new Animated.Value(0)}
        onPress={noop}
        testID="play"
      />
    ),
    find: () => screen.getByTestId("play"),
    on: "accent",
    shape: "round",
  },
  {
    name: "RecentRow",
    element: () => <RecentRow label="query" onPress={noop} removeLabel="Remove" onRemove={noop} />,
    find: () => screen.getByRole("button", { name: "query" }),
    on: "surface",
    shape: "rect",
  },
  {
    name: "SegmentedControl",
    element: () => (
      <SegmentedControl options={[{ key: "a", label: "Alpha" }]} selected="a" onChange={noop} />
    ),
    find: () => {
      const [first] = screen.getAllByRole("tab");
      if (first === undefined) throw new Error("no tab rendered");
      return first;
    },
    on: "surface",
    shape: "own",
  },
  {
    name: "TrackRow",
    element: () => <TrackRow number={1} title="Track" available onPress={noop} />,
    find: () => screen.getByRole("button", { name: "Track" }),
    on: "surface",
    shape: "rect",
  },
  {
    name: "Notice action",
    element: () => (
      <Notice floating tone="error" message="Failed" action={{ label: "Undo", onPress: noop }} />
    ),
    find: () => screen.getByRole("button", { name: "Undo" }),
    on: "accent",
    shape: "round",
    androidOnly: true,
  },
  {
    name: "TrackRow with trailing",
    element: () => <TrackRow number={1} title="Track" available onPress={noop} trailing={null} />,
    find: () => screen.getByRole("button", { name: "Track" }),
    on: "surface",
    shape: "rect",
  },
];

const iosSites = sites.filter((s) => s.androidOnly !== true);

function flat(node: PressableNode): ViewStyle {
  // An unstyled pressable (PlayButton at rest) has no style: flatten gives undefined and assign skips it.
  return Object.assign({}, StyleSheet.flatten(node.props.style as StyleProp<ViewStyle>));
}

describe("press feedback usage", () => {
  it.each(iosSites)("$name has no ripple and does not fade at rest on iOS", async (site) => {
    Platform.OS = "ios";
    await render(site.element());
    const node = site.find();
    expect(node.props.nativeForegroundAndroid).toBeUndefined();
    expect(node.props.nativeBackgroundAndroid).toBeUndefined();
    expect(flat(node)).not.toHaveProperty("opacity");
  });

  it.each(iosSites)("$name fades to motion.pressOpacity while pressed on iOS", async (site) => {
    Platform.OS = "ios";
    await render(site.element());
    await fireEvent(site.find(), "responderGrant", {
      nativeEvent: { touches: [], pageX: 0, pageY: 0, timestamp: 0 },
      persist: () => undefined,
      currentTarget: 1,
    });
    expect(flat(site.find()).opacity).toBe(motion.pressOpacity);
  });

  it("MiniPlayer keeps its text off the right cap of the clip on Android only", async () => {
    const site = sites.find((s) => s.name === "MiniPlayer");
    if (site === undefined) throw new Error("MiniPlayer site missing");
    Platform.OS = "android";
    const android = await render(site.element());
    expect(flat(site.find()).paddingRight).toBe(spacing.md);
    await android.unmount();
    Platform.OS = "ios";
    await render(site.element());
    expect(flat(site.find())).not.toHaveProperty("paddingRight");
    expect(flat(site.find()).paddingHorizontal).toBe(spacing.xs);
  });

  it.each(sites)("$name ripples over its content on Android", async (site) => {
    Platform.OS = "android";
    await render(site.element());
    const node = site.find();
    const expected = site.on === "accent" ? color.overlay.rippleOnAccent : color.overlay.ripple;
    expect(node.props.nativeForegroundAndroid).toMatchObject({
      type: "RippleAndroid",
      borderless: false,
      color: processColor(expected),
    });
    expect(node.props.nativeBackgroundAndroid).toBeUndefined();
    const style = flat(node);
    expect(style.overflow).toBe("hidden");
    expect(style).not.toHaveProperty("opacity");
    if (site.shape === "round") expect(style.borderRadius).toBe(radius.full);
    if (site.shape === "rect") expect(style).not.toHaveProperty("borderRadius");
  });
});

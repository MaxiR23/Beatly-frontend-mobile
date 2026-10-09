// INFO: a list row, pressable when given onPress: a cover at the start, a title and an optional secondary line; regular for songs, medium for the library, large for an artist; an icon replaces the images with an accent tile; an unavailable row draws its texts disabled, is never pressable and is one element announced by its unavailable label; a trailing element sits after the pressable body, outside it; the current track draws the now playing bars over the cover, on a scrim.
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { color } from "../tokens/color.ts";
import { motion } from "../tokens/motion.ts";
import { radius } from "../tokens/radius.ts";
import { layout, spacing } from "../tokens/spacing.ts";
import { Cover } from "./Cover.tsx";
import type { IconName } from "./Icon.tsx";
import { NowPlayingBars } from "./NowPlayingBars.tsx";
import { Text } from "./Text.tsx";

interface MediaRowProps {
  title: string;
  subtitle?: string | undefined;
  urls: readonly string[];
  shape: "square" | "round";
  size?: "regular" | "medium" | "large";
  icon?: IconName | undefined;
  available?: boolean;
  onPress?: (() => void) | undefined;
  // Read by a screen reader in place of the texts when the row is unavailable; the caller translates it.
  unavailableLabel?: string | undefined;
  // A control at the end of the row, a sibling of the pressable body so both are reachable.
  trailing?: ReactNode;
  // Draws the now playing bars; undefined for any other track.
  nowPlaying?: "playing" | "paused" | undefined;
  reduceMotion?: boolean;
  testID?: string;
}

export function MediaRow({
  title,
  subtitle,
  urls,
  shape,
  size = "regular",
  icon,
  available = true,
  onPress: onPressProp,
  unavailableLabel,
  trailing,
  nowPlaying,
  reduceMotion = false,
  testID,
}: MediaRowProps) {
  const onPress = available ? onPressProp : undefined;
  const marked = available && nowPlaying !== undefined;
  const large = size === "large";
  const medium = size === "medium";
  const coverSize = large ? layout.rowCoverLarge : medium ? layout.rowCoverMedium : layout.rowCover;
  const content = (
    <>
      <View style={styles.cover}>
        <Cover urls={urls} shape={shape} size={coverSize} icon={icon} />
        {marked ? (
          <View
            style={[
              StyleSheet.absoluteFill,
              styles.scrim,
              shape === "round" ? styles.scrimRound : styles.scrimSquare,
            ]}
          >
            <NowPlayingBars
              state={nowPlaying}
              reduceMotion={reduceMotion}
              testID="now-playing-bars"
            />
          </View>
        ) : null}
      </View>
      <View style={styles.text}>
        <Text
          variant={large ? "subtitle" : "rowTitle"}
          tone={available ? "primary" : "disabled"}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle !== undefined ? (
          <Text variant="meta" tone={available ? "secondary" : "disabled"} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </>
  );

  const still = available
    ? marked
      ? { accessibilityState: { selected: true } }
      : {}
    : {
        accessible: true,
        accessibilityLabel: unavailableLabel ?? title,
        accessibilityState: { disabled: true },
      };

  if (trailing !== undefined) {
    const body =
      onPress === undefined ? (
        <View style={styles.body} {...still}>
          {content}
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={title}
          accessibilityState={marked ? { selected: true } : undefined}
          onPress={onPress}
          style={({ pressed }) => [styles.body, pressed && styles.pressed]}
        >
          {content}
        </Pressable>
      );
    return (
      <View style={[styles.split, medium ? styles.rowMedium : undefined]} testID={testID}>
        {body}
        {trailing}
      </View>
    );
  }

  if (onPress === undefined) {
    return (
      <View style={[styles.row, medium ? styles.rowMedium : undefined]} {...still} testID={testID}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={marked ? { selected: true } : undefined}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        medium ? styles.rowMedium : undefined,
        pressed && styles.pressed,
      ]}
      testID={testID}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: layout.gutter,
    paddingVertical: spacing.sm,
    gap: layout.gap,
  },
  rowMedium: { paddingVertical: spacing.xs },
  split: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingRight: layout.gutter,
  },
  body: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: layout.gutter,
    gap: layout.gap,
  },
  cover: { position: "relative" },
  scrim: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.overlay.onImage,
  },
  scrimRound: { borderRadius: radius.full },
  scrimSquare: { borderRadius: radius.sm },
  pressed: { opacity: motion.pressOpacity },
  text: { flex: 1, gap: spacing.xxs },
});

// INFO: a track row, pressable when given onPress: a leading number in a fixed column, a
// one-line title and an optional one-line artists line; an unavailable
// track draws both texts disabled, is never pressable and is one element announced by its unavailable label; a trailing element sits after the pressable body, outside it; the current track draws the now playing bars in place of the number.
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { layout, spacing } from "../tokens/spacing.ts";
import { NowPlayingBars } from "./NowPlayingBars.tsx";
import { Text } from "./Text.tsx";
import { pressFeedback } from "./pressFeedback.ts";

interface TrackRowProps {
  number: number;
  title: string;
  subtitle?: string | undefined;
  available: boolean;
  onPress?: (() => void) | undefined;
  // Read by a screen reader in place of the texts when the track is unavailable; the caller translates it.
  unavailableLabel?: string | undefined;
  // A control at the end of the row, a sibling of the pressable body so both are reachable.
  trailing?: ReactNode;
  // Draws the now playing bars; undefined for any other track.
  nowPlaying?: "playing" | "paused" | undefined;
  reduceMotion?: boolean;
  testID?: string;
}

export function TrackRow({
  number,
  title,
  subtitle,
  available,
  onPress: onPressProp,
  unavailableLabel,
  trailing,
  nowPlaying,
  reduceMotion = false,
  testID,
}: TrackRowProps) {
  const onPress = available ? onPressProp : undefined;
  const press = pressFeedback();
  const marked = available && nowPlaying !== undefined;
  const state = marked ? { disabled: false, selected: true } : { disabled: !available };
  const still = available
    ? { accessibilityState: marked ? state : { disabled: false } }
    : {
        accessible: true,
        accessibilityLabel: unavailableLabel ?? title,
        accessibilityState: { disabled: true },
      };
  const content = (
    <>
      <View style={styles.number}>
        {marked ? (
          <NowPlayingBars
            state={nowPlaying}
            reduceMotion={reduceMotion}
            testID="now-playing-bars"
          />
        ) : (
          <Text variant="meta" tone={available ? "tertiary" : "disabled"}>
            {String(number)}
          </Text>
        )}
      </View>
      <View style={styles.text}>
        <Text variant="rowTitle" tone={available ? "primary" : "disabled"} numberOfLines={1}>
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

  if (trailing !== undefined) {
    const body =
      onPress === undefined ? (
        <View style={styles.body} {...still}>
          {content}
        </View>
      ) : (
        <Pressable
          android_ripple={press.android_ripple}
          accessibilityRole="button"
          accessibilityLabel={title}
          accessibilityState={state}
          onPress={onPress}
          style={({ pressed }) => [styles.body, press.style(pressed)]}
        >
          {content}
        </Pressable>
      );
    return (
      <View style={[styles.split]} testID={testID}>
        {body}
        {trailing}
      </View>
    );
  }

  if (onPress === undefined) {
    return (
      <View style={[styles.row]} {...still} testID={testID}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      android_ripple={press.android_ripple}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={state}
      onPress={onPress}
      style={({ pressed }) => [styles.row, press.style(pressed)]}
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
  number: { width: layout.trackNumber },
  text: { flex: 1, gap: spacing.xxs },
});

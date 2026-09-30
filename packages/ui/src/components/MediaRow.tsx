// INFO: a list row, pressable when given onPress: a cover at the start, a title and an optional secondary line; regular for songs, medium for the library, large for an artist; an icon replaces the images with an accent tile; an unavailable row draws its texts disabled.
import { Pressable, StyleSheet, View } from "react-native";

import { motion } from "../tokens/motion.ts";
import { layout, spacing } from "../tokens/spacing.ts";
import { Cover } from "./Cover.tsx";
import type { IconName } from "./Icon.tsx";
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
  onPress,
  testID,
}: MediaRowProps) {
  const large = size === "large";
  const medium = size === "medium";
  const coverSize = large ? layout.rowCoverLarge : medium ? layout.rowCoverMedium : layout.rowCover;
  const content = (
    <>
      <Cover urls={urls} shape={shape} size={coverSize} icon={icon} />
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

  const state = available ? undefined : { disabled: true };

  if (onPress === undefined) {
    return (
      <View
        style={[styles.row, medium ? styles.rowMedium : undefined]}
        accessibilityState={state}
        testID={testID}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={state}
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
  pressed: { opacity: motion.pressOpacity },
  text: { flex: 1, gap: spacing.xxs },
});

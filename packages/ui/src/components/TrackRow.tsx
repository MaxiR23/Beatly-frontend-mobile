// INFO: a track row, pressable when given onPress: a leading number in a fixed column, a
// one-line title and an optional one-line artists line; an unavailable
// track draws both texts disabled.
import { Pressable, StyleSheet, View } from "react-native";

import { motion } from "../tokens/motion.ts";
import { layout, spacing } from "../tokens/spacing.ts";
import { Text } from "./Text.tsx";

interface TrackRowProps {
  number: number;
  title: string;
  subtitle?: string | undefined;
  available: boolean;
  onPress?: (() => void) | undefined;
  testID?: string;
}

export function TrackRow({ number, title, subtitle, available, onPress, testID }: TrackRowProps) {
  const content = (
    <>
      <View style={styles.number}>
        <Text variant="meta" tone={available ? "tertiary" : "disabled"}>
          {String(number)}
        </Text>
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

  if (onPress === undefined) {
    return (
      <View style={styles.row} accessibilityState={{ disabled: !available }} testID={testID}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !available }}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
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
  pressed: { opacity: motion.pressOpacity },
  number: { width: layout.trackNumber },
  text: { flex: 1, gap: spacing.xxs },
});

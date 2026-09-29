// INFO: a carousel card: a cover, a one-line title and a one-line subtitle;
// a button when given onPress, a plain view otherwise.
import { Pressable, StyleSheet, View } from "react-native";

import { motion } from "../tokens/motion.ts";
import { layout, spacing } from "../tokens/spacing.ts";
import { Cover } from "./Cover.tsx";
import { Text } from "./Text.tsx";

interface MediaCardProps {
  title?: string | undefined;
  subtitle?: string | undefined;
  urls: readonly string[];
  shape: "square" | "round";
  size?: number;
  onPress?: (() => void) | undefined;
}

export function MediaCard({
  title,
  subtitle,
  urls,
  shape,
  size = layout.carouselCard,
  onPress,
}: MediaCardProps) {
  const content = (
    <>
      <Cover urls={urls} shape={shape} size={size} />
      {title !== undefined ? (
        <Text variant="rowTitle" numberOfLines={1}>
          {title}
        </Text>
      ) : null}
      {subtitle !== undefined ? (
        <Text variant="meta" tone="secondary" numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </>
  );

  if (onPress === undefined) {
    return <View style={[styles.card, { width: size }]}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.card, { width: size }, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.xs },
  pressed: { opacity: motion.pressOpacity },
});

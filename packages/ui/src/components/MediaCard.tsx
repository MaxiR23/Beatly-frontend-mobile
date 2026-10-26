// INFO: a carousel card: a cover, a one-line title and a one-line subtitle;
// a button when given onPress, a plain view otherwise.
import { Pressable, StyleSheet, View } from "react-native";

import { layout, spacing } from "../tokens/spacing.ts";
import { Cover } from "./Cover.tsx";
import type { ImageTiers } from "./imageTier.ts";
import { Text } from "./Text.tsx";
import { pressFeedback } from "./pressFeedback.ts";

interface MediaCardProps {
  title?: string | undefined;
  subtitle?: string | undefined;
  images: readonly ImageTiers[];
  shape: "square" | "round";
  size?: number;
  onPress?: (() => void) | undefined;
}

export function MediaCard({
  title,
  subtitle,
  images,
  shape,
  size = layout.carouselCard,
  onPress,
}: MediaCardProps) {
  const press = pressFeedback();

  const content = (
    <>
      <Cover images={images} shape={shape} size={size} />
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
      android_ripple={press.android_ripple}
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.card, { width: size }, press.style(pressed)]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.xs },
});

// INFO: a carousel card: a cover, a one-line title and a one-line subtitle.
import { StyleSheet, View } from "react-native";

import { layout, spacing } from "../tokens/spacing.ts";
import { Cover } from "./Cover.tsx";
import { Text } from "./Text.tsx";

interface MediaCardProps {
  title?: string | undefined;
  subtitle?: string | undefined;
  urls: readonly string[];
  shape: "square" | "round";
  size?: number;
}

export function MediaCard({
  title,
  subtitle,
  urls,
  shape,
  size = layout.carouselCard,
}: MediaCardProps) {
  return (
    <View style={[styles.card, { width: size }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.xs },
});

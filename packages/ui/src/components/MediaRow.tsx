// INFO: a non-pressable list row: a cover at the start, a title and an optional secondary line; regular for songs, medium for the library, large for an artist; an icon replaces the images with an accent tile.
import { StyleSheet, View } from "react-native";

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
  testID?: string;
}

export function MediaRow({
  title,
  subtitle,
  urls,
  shape,
  size = "regular",
  icon,
  testID,
}: MediaRowProps) {
  const large = size === "large";
  const medium = size === "medium";
  const coverSize = large ? layout.rowCoverLarge : medium ? layout.rowCoverMedium : layout.rowCover;
  return (
    <View style={[styles.row, medium ? styles.rowMedium : undefined]} testID={testID}>
      <Cover urls={urls} shape={shape} size={coverSize} icon={icon} />
      <View style={styles.text}>
        <Text variant={large ? "subtitle" : "rowTitle"} numberOfLines={1}>
          {title}
        </Text>
        {subtitle !== undefined ? (
          <Text variant="meta" tone="secondary" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
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
  text: { flex: 1, gap: spacing.xxs },
});

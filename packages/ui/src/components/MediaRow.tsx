// INFO: a non-pressable list row: a cover at the start, a title and an optional secondary line; regular for songs, large for an artist.
import { StyleSheet, View } from "react-native";

import { layout, spacing } from "../tokens/spacing.ts";
import { Cover } from "./Cover.tsx";
import { Text } from "./Text.tsx";

interface MediaRowProps {
  title: string;
  subtitle?: string | undefined;
  urls: readonly string[];
  shape: "square" | "round";
  size?: "regular" | "large";
  testID?: string;
}

export function MediaRow({
  title,
  subtitle,
  urls,
  shape,
  size = "regular",
  testID,
}: MediaRowProps) {
  const large = size === "large";
  return (
    <View style={styles.row} testID={testID}>
      <Cover urls={urls} shape={shape} size={large ? layout.rowCoverLarge : layout.rowCover} />
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
  text: { flex: 1, gap: spacing.xxs },
});

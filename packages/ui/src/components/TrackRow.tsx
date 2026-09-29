// INFO: a non-pressable track row: a leading number in a fixed column, a
// one-line title and an optional one-line artists line; an unavailable
// track draws both texts disabled.
import { StyleSheet, View } from "react-native";

import { layout, spacing } from "../tokens/spacing.ts";
import { Text } from "./Text.tsx";

interface TrackRowProps {
  number: number;
  title: string;
  subtitle?: string | undefined;
  available: boolean;
  testID?: string;
}

export function TrackRow({ number, title, subtitle, available, testID }: TrackRowProps) {
  return (
    <View style={styles.row} accessibilityState={{ disabled: !available }} testID={testID}>
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
  number: { width: layout.trackNumber },
  text: { flex: 1, gap: spacing.xxs },
});

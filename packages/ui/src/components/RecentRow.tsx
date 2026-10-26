// INFO: a pressable recent-query row: a clock icon, the query in one line and a remove button as a sibling of the pressable part, so both are reachable by screen readers; control height tall.
import { Pressable, StyleSheet, View } from "react-native";

import { layout, spacing } from "../tokens/spacing.ts";
import { Icon } from "./Icon.tsx";
import { IconButton } from "./IconButton.tsx";
import { Text } from "./Text.tsx";
import { pressFeedback } from "./pressFeedback.ts";

interface RecentRowProps {
  label: string;
  onPress: () => void;
  removeLabel: string;
  onRemove: () => void;
}

export function RecentRow({ label, onPress, removeLabel, onRemove }: RecentRowProps) {
  const press = pressFeedback();
  return (
    <View style={styles.row}>
      <Pressable
        android_ripple={press.android_ripple}
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => [styles.main, press.style(pressed)]}
      >
        <Icon name="clock" size="md" tone="tertiary" />
        <View style={styles.text}>
          <Text variant="body" numberOfLines={1}>
            {label}
          </Text>
        </View>
      </Pressable>
      <IconButton icon="x" accessibilityLabel={removeLabel} onPress={onRemove} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: layout.gutter,
    paddingRight: spacing.xs,
    gap: layout.gap,
  },
  main: { flex: 1, flexDirection: "row", alignItems: "center", gap: layout.gap },
  text: { flex: 1 },
});

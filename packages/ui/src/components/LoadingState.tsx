// INFO: the loading state every screen draws; the caller passes the
// accessibility label already translated.
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { color } from "../tokens/color.ts";
import { layout, spacing } from "../tokens/spacing.ts";

interface LoadingStateProps {
  label: string;
}

export function LoadingState({ label }: LoadingStateProps) {
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label} style={styles.box}>
      <ActivityIndicator size="large" color={color.accent.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: layout.gutter,
    gap: spacing.md,
  },
});

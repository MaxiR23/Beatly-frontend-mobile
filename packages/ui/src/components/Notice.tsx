// INFO: a brief message: a check or an x and one meta line in the success or error tone; floating wraps it in a glass bar. It is announced politely to screen readers.
import { StyleSheet, View } from "react-native";

import { spacing } from "../tokens/spacing.ts";
import { GlassSurface } from "./GlassSurface.tsx";
import { Icon } from "./Icon.tsx";
import { Text } from "./Text.tsx";

interface NoticeProps {
  tone: "success" | "error";
  message: string;
  floating?: boolean;
  testID?: string;
}

export function Notice({ tone, message, floating = false, testID }: NoticeProps) {
  const row = (
    <View
      style={styles.row}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      testID={testID}
    >
      <Icon name={tone === "success" ? "check" : "x"} size="md" tone={tone} />
      <Text variant="meta" tone="primary">
        {message}
      </Text>
    </View>
  );
  return floating ? <GlassSurface variant="bar">{row}</GlassSurface> : row;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
});

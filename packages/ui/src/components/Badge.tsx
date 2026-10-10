// INFO: a read-only status pill: one uppercase label in a tone on a subtle overlay, small radius.
import { StyleSheet, View } from "react-native";

import { color } from "../tokens/color.ts";
import { radius } from "../tokens/radius.ts";
import { spacing } from "../tokens/spacing.ts";
import { Text } from "./Text.tsx";
import type { Tone } from "./tone.ts";

interface BadgeProps {
  label: string;
  tone?: Tone;
  testID?: string;
}

export function Badge({ label, tone = "secondary", testID }: BadgeProps) {
  return (
    <View style={styles.badge} testID={testID}>
      <Text variant="label" tone={tone}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    backgroundColor: color.overlay.subtle,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
});

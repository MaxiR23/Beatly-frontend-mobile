// INFO: a labeled switch with a helper line under the label; track and thumb colors come from tokens.
import { StyleSheet, Switch, View } from "react-native";

import { color } from "../tokens/color.ts";
import { layout, spacing } from "../tokens/spacing.ts";
import { Text } from "./Text.tsx";

interface SwitchRowProps {
  label: string;
  helper: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export function SwitchRow({ label, helper, value, onValueChange }: SwitchRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text variant="body">{label}</Text>
        <Text variant="meta" tone="secondary">
          {helper}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        accessibilityLabel={label}
        trackColor={{ false: color.surface.border, true: color.accent.primary }}
        thumbColor={value ? color.text.inverse : color.text.primary}
        ios_backgroundColor={color.surface.border}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: layout.gap },
  text: { flex: 1, gap: spacing.xxs },
});

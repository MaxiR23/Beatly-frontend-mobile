// INFO: a pressable action: an icon and a label at control height, in the error tone when destructive; the icon can be filled.
import { Pressable, StyleSheet } from "react-native";

import { motion } from "../tokens/motion.ts";
import { layout, spacing } from "../tokens/spacing.ts";
import { Icon, type IconName } from "./Icon.tsx";
import { Text } from "./Text.tsx";

interface ActionRowProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  filled?: boolean;
  testID?: string;
}

export function ActionRow({
  icon,
  label,
  onPress,
  destructive = false,
  filled,
  testID,
}: ActionRowProps) {
  const tone = destructive ? "error" : "primary";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      testID={testID}
    >
      <Icon name={icon} size="md" tone={tone} filled={filled} />
      <Text variant="body" tone={tone}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: layout.controlHeight,
    gap: layout.gap,
    paddingVertical: spacing.sm,
  },
  pressed: { opacity: motion.pressOpacity },
});

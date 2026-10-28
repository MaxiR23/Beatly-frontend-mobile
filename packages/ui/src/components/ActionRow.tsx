// INFO: a pressable action: an icon and a label at control height, in the error tone when destructive; the icon can be filled; on Android, the Material 3 list item: full width, 56 tall, a 22 icon.
import { Pressable, StyleSheet } from "react-native";

import { layout, spacing } from "../tokens/spacing.ts";
import { Icon, type IconName } from "./Icon.tsx";
import { Text } from "./Text.tsx";
import { isAndroidVariant } from "./platform.ts";
import { pressFeedback } from "./pressFeedback.ts";

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
  const press = pressFeedback();
  const android = isAndroidVariant();
  return (
    <Pressable
      android_ripple={press.android_ripple}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, android && styles.rowAndroid, press.style(pressed)]}
      testID={testID}
    >
      <Icon name={icon} size={android ? "actionRowAndroid" : "md"} tone={tone} filled={filled} />
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
  // Full width inside the Android Sheet: bleeds through its spacing.xl content padding (ActionRow is drawn only in a Sheet).
  rowAndroid: {
    minHeight: layout.actionRowHeightAndroid,
    paddingVertical: 0,
    marginHorizontal: -spacing.xl,
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
});

// INFO: a filter chip that is selected or not, with a fixed height. iOS draws a pill; on Android it is the Material 3 filter chip (ADR 027): 32 tall, 8 corners, an outline when unselected, the selected fill and a leading check when selected.
import { Pressable, StyleSheet } from "react-native";

import { border } from "../tokens/border.ts";
import { color } from "../tokens/color.ts";
import { radius } from "../tokens/radius.ts";
import { layout, spacing } from "../tokens/spacing.ts";
import { Icon } from "./Icon.tsx";
import { Text } from "./Text.tsx";
import { isAndroidVariant } from "./platform.ts";
import { pressFeedback } from "./pressFeedback.ts";

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export function Chip({ label, selected, onPress }: ChipProps) {
  const android = isAndroidVariant();
  // On Android the selected fill is no longer the accent (ADR 027); iOS ignores `on`.
  const press = pressFeedback({ on: selected && !android ? "accent" : "surface" });
  const look = android
    ? selected
      ? styles.androidSelected
      : styles.androidUnselected
    : selected
      ? styles.selected
      : styles.unselected;
  const tone = android ? (selected ? "primary" : "secondary") : selected ? "inverse" : "primary";
  return (
    <Pressable
      android_ripple={press.android_ripple}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [android ? styles.android : styles.base, look, press.style(pressed)]}
    >
      {android && selected ? <Icon name="check" size="sm" tone="primary" /> : null}
      <Text variant="button" tone={tone}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: layout.chipHeight,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  android: {
    height: layout.chipHeightAndroid,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
  },
  androidUnselected: { borderWidth: border.width, borderColor: color.surface.border },
  androidSelected: { backgroundColor: color.overlay.muted, paddingStart: spacing.sm },
  selected: { backgroundColor: color.accent.primary },
  unselected: { backgroundColor: color.surface.control },
});

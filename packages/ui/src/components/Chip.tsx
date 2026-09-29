// INFO: a filter chip: a pill that is selected or not, with a fixed height.
import { Pressable, StyleSheet } from "react-native";

import { color } from "../tokens/color.ts";
import { motion } from "../tokens/motion.ts";
import { radius } from "../tokens/radius.ts";
import { layout, spacing } from "../tokens/spacing.ts";
import { Text } from "./Text.tsx";

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        selected ? styles.selected : styles.unselected,
        pressed && styles.pressed,
      ]}
    >
      <Text variant="button" tone={selected ? "inverse" : "primary"}>
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
  selected: { backgroundColor: color.accent.primary },
  unselected: { backgroundColor: color.surface.control },
  pressed: { opacity: motion.pressOpacity },
});

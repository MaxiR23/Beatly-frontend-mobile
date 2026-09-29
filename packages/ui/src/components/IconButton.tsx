// INFO: an icon-only square pressable with a control-height touch target.
import { Pressable, StyleSheet } from "react-native";

import { motion } from "../tokens/motion.ts";
import { layout } from "../tokens/spacing.ts";
import { Icon, type IconName } from "./Icon.tsx";

interface IconButtonProps {
  icon: IconName;
  accessibilityLabel: string;
  onPress: () => void;
}

export function IconButton({ icon, accessibilityLabel, onPress }: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.box, pressed && styles.pressed]}
    >
      <Icon name={icon} size="lg" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    width: layout.controlHeight,
    height: layout.controlHeight,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: motion.pressOpacity },
});

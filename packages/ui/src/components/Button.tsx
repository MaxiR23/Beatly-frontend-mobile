// INFO: pill or field-shaped button with primary, secondary and ghost variants, a loading
// state that swaps the label for a spinner, and a disabled state.
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";

import { color } from "../tokens/color.ts";
import { motion } from "../tokens/motion.ts";
import { radius } from "../tokens/radius.ts";
import { layout, spacing } from "../tokens/spacing.ts";
import { Text } from "./Text.tsx";
import { toneColor, type Tone } from "./tone.ts";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost";
  shape?: "pill" | "field";
  loading?: boolean;
  disabled?: boolean;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  shape = "pill",
  loading = false,
  disabled = false,
}: ButtonProps) {
  const inactive = disabled || loading;
  const labelTone: Tone = disabled ? "disabled" : variant === "primary" ? "inverse" : "primary";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        shape === "field" && styles.field,
        styles[variant],
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={toneColor[labelTone]} />
      ) : (
        <Text variant="button" tone={labelTone}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  field: { borderRadius: radius.md, minHeight: layout.controlHeight },
  primary: { backgroundColor: color.accent.primary },
  secondary: { backgroundColor: color.surface.control },
  ghost: { backgroundColor: color.overlay.subtle },
  disabled: { backgroundColor: color.surface.control },
  pressed: { opacity: motion.pressOpacity },
});

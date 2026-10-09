// INFO: an icon-only square pressable with a control-height touch target; primary is the large accent play button, primaryCompact is the control-height accent circle, disabled greys it out and ignores presses, selected is a toggle's on and off tone, busy swaps the glyph for a spinner; an optional icon size and a filled glyph.
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";

import { color } from "../tokens/color.ts";
import type { icon as iconTokens } from "../tokens/icon.ts";
import { motion } from "../tokens/motion.ts";
import { radius } from "../tokens/radius.ts";
import { layout } from "../tokens/spacing.ts";
import { Icon, type IconName } from "./Icon.tsx";
import { toneColor, type Tone } from "./tone.ts";

interface IconButtonProps {
  icon: IconName;
  accessibilityLabel: string;
  onPress: () => void;
  variant?: "plain" | "primary" | "primaryCompact";
  // When defined the button is a toggle: primary tone when true, secondary when false.
  selected?: boolean;
  busy?: boolean;
  disabled?: boolean;
  iconSize?: keyof typeof iconTokens.size;
  filled?: boolean;
}

export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  variant = "plain",
  selected,
  busy,
  disabled,
  iconSize,
  filled,
}: IconButtonProps) {
  const primary = variant === "primary";
  const compact = variant === "primaryCompact";
  const accent = primary || compact;
  const tone: Tone =
    disabled === true
      ? "disabled"
      : accent
        ? "inverse"
        : selected === undefined
          ? "primary"
          : selected
            ? "primary"
            : "secondary";
  const state: { selected?: boolean; busy?: boolean; disabled?: boolean } = {};
  if (selected !== undefined) state.selected = selected;
  if (busy !== undefined) state.busy = busy;
  if (disabled !== undefined) state.disabled = disabled;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={
        selected === undefined && busy === undefined && disabled === undefined ? undefined : state
      }
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.box,
        primary && styles.primary,
        compact && styles.compact,
        accent && disabled === true && styles.inactive,
        pressed && styles.pressed,
      ]}
    >
      {busy === true ? (
        <ActivityIndicator color={toneColor[tone]} testID="icon-button-busy" />
      ) : (
        <Icon name={icon} size={iconSize ?? (primary ? "xl" : "lg")} tone={tone} filled={filled} />
      )}
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
  primary: {
    width: layout.playButton,
    height: layout.playButton,
    borderRadius: radius.full,
    backgroundColor: color.accent.primary,
  },
  compact: { borderRadius: radius.full, backgroundColor: color.accent.primary },
  inactive: { backgroundColor: color.surface.control },
  pressed: { opacity: motion.pressOpacity },
});

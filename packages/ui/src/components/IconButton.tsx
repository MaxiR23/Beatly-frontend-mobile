// INFO: an icon-only square pressable with a control-height touch target; primary is the large accent play button, primaryCompact is the control-height accent circle, selected is a toggle's on and off tone, busy swaps the glyph for a spinner; an optional icon size and a filled glyph.
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
  iconSize,
  filled,
}: IconButtonProps) {
  const primary = variant === "primary";
  const compact = variant === "primaryCompact";
  const tone: Tone =
    primary || compact
      ? "inverse"
      : selected === undefined
        ? "primary"
        : selected
          ? "primary"
          : "secondary";
  const state: { selected?: boolean; busy?: boolean } = {};
  if (selected !== undefined) state.selected = selected;
  if (busy !== undefined) state.busy = busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={selected === undefined && busy === undefined ? undefined : state}
      onPress={onPress}
      style={({ pressed }) => [
        styles.box,
        primary && styles.primary,
        compact && styles.compact,
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
  pressed: { opacity: motion.pressOpacity },
});

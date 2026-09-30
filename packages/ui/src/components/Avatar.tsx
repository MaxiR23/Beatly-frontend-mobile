// INFO: the avatar: the user's initials on a palette gradient chosen from
// the name, or a user icon when there is no name. Pressable (a button) when
// given onPress, decorative otherwise; the header size is layout.avatar and
// the creator size, for a detail creator line, layout.creatorMark.
import { Pressable, StyleSheet, View } from "react-native";

import { motion } from "../tokens/motion.ts";
import { radius } from "../tokens/radius.ts";
import { layout } from "../tokens/spacing.ts";
import { avatarGradient, initialsOf } from "./avatarIdentity.ts";
import { GradientFill } from "./GradientFill.tsx";
import { Icon } from "./Icon.tsx";
import { Text } from "./Text.tsx";

interface AvatarProps {
  name: string | null;
  accessibilityLabel?: string;
  onPress?: (() => void) | undefined;
  size?: "header" | "creator";
}

export function Avatar({ name, accessibilityLabel, onPress, size = "header" }: AvatarProps) {
  const [from, to] = avatarGradient(name);
  const initials = initialsOf(name);
  const creator = size === "creator";
  const side = creator ? layout.creatorMark : layout.avatar;
  const box = { width: side, height: side };

  const content = (
    <>
      <GradientFill colors={[from, to]} direction="diagonal" />
      {initials !== "" ? (
        <Text variant={creator ? "label" : "rowTitle"} tone="inverse">
          {initials}
        </Text>
      ) : (
        <Icon name="user" size={creator ? "sm" : "md"} tone="inverse" />
      )}
    </>
  );

  if (onPress === undefined) {
    return (
      <View accessible={false} style={[styles.box, box]}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={layout.hitSlop}
      onPress={onPress}
      style={({ pressed }) => [styles.box, box, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radius.full,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: motion.pressOpacity },
});

// INFO: the avatar: the user's initials on a palette gradient chosen from
// the name, or a user icon when there is no name. Pressable (a button) when
// given onPress, decorative otherwise; the header size is layout.avatar and
// the creator size, for a detail creator line, layout.creatorMark, and
// the profile size, for the profile screen, layout.profileAvatar.
import { Pressable, StyleSheet, View } from "react-native";

import { radius } from "../tokens/radius.ts";
import { layout } from "../tokens/spacing.ts";
import { avatarGradient, initialsOf } from "./avatarIdentity.ts";
import { GradientFill } from "./GradientFill.tsx";
import { Icon } from "./Icon.tsx";
import { Text } from "./Text.tsx";
import { pressFeedback } from "./pressFeedback.ts";

interface AvatarProps {
  name: string | null;
  accessibilityLabel?: string;
  onPress?: (() => void) | undefined;
  size?: "header" | "creator" | "profile";
}

export function Avatar({ name, accessibilityLabel, onPress, size = "header" }: AvatarProps) {
  const [from, to] = avatarGradient(name);
  const initials = initialsOf(name);
  const side =
    size === "profile"
      ? layout.profileAvatar
      : size === "creator"
        ? layout.creatorMark
        : layout.avatar;
  const initialsVariant =
    size === "profile" ? "display" : size === "creator" ? "label" : "rowTitle";
  const iconSize = size === "profile" ? "xl" : size === "creator" ? "sm" : "md";
  const box = { width: side, height: side };

  const press = pressFeedback();

  const content = (
    <>
      <GradientFill colors={[from, to]} direction="diagonal" />
      {initials !== "" ? (
        <Text variant={initialsVariant} tone="inverse">
          {initials}
        </Text>
      ) : (
        <Icon name="user" size={iconSize} tone="inverse" />
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
      android_ripple={press.android_ripple}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={layout.hitSlop}
      onPress={onPress}
      style={({ pressed }) => [styles.box, box, press.style(pressed)]}
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
});

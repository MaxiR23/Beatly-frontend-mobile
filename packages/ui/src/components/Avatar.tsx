// INFO: the account avatar: the user's initials on a palette gradient
// chosen from the name, or a user icon when there is no name.
import { Pressable, StyleSheet } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { motion } from "../tokens/motion.ts";
import { radius } from "../tokens/radius.ts";
import { layout } from "../tokens/spacing.ts";
import { avatarGradient, initialsOf } from "./avatarIdentity.ts";
import { Icon } from "./Icon.tsx";
import { Text } from "./Text.tsx";

interface AvatarProps {
  name: string | null;
  accessibilityLabel: string;
  onPress: () => void;
}

export function Avatar({ name, accessibilityLabel, onPress }: AvatarProps) {
  const [from, to] = avatarGradient(name);
  const initials = initialsOf(name);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={layout.hitSlop}
      onPress={onPress}
      style={({ pressed }) => [styles.box, pressed && styles.pressed]}
    >
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="avatar" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#avatar)" />
      </Svg>
      {initials !== "" ? (
        <Text variant="rowTitle" tone="inverse">
          {initials}
        </Text>
      ) : (
        <Icon name="user" size="md" tone="inverse" />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    width: layout.avatar,
    height: layout.avatar,
    borderRadius: radius.full,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: motion.pressOpacity },
});

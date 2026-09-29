// INFO: the account avatar: the user's initials on a palette gradient
// chosen from the name, or a user icon when there is no name.
import { Pressable, StyleSheet } from "react-native";

import { motion } from "../tokens/motion.ts";
import { radius } from "../tokens/radius.ts";
import { layout } from "../tokens/spacing.ts";
import { avatarGradient, initialsOf } from "./avatarIdentity.ts";
import { GradientFill } from "./GradientFill.tsx";
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
      <GradientFill colors={[from, to]} direction="diagonal" />
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

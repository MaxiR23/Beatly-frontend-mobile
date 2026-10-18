// INFO: a pressable row led by the header avatar: a title over a secondary line and a trailing chevron, or a skeleton circle and bar in place of the avatar and the title while there is no identity; the account sheet's profile row.
import { Pressable, StyleSheet, View } from "react-native";

import { motion } from "../tokens/motion.ts";
import { layout, spacing } from "../tokens/spacing.ts";
import { Avatar } from "./Avatar.tsx";
import { Icon } from "./Icon.tsx";
import { SkeletonBar, SkeletonCircle } from "./Skeleton.tsx";
import { Text } from "./Text.tsx";

interface AvatarRowProps {
  // null while there is no profile to draw: a skeleton circle and bar stand in for the avatar and the title.
  identity: { name: string | null; title: string } | null;
  subtitle: string;
  accessibilityLabel: string;
  onPress: () => void;
}

export function AvatarRow({ identity, subtitle, accessibilityLabel, onPress }: AvatarRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {identity ? <Avatar name={identity.name} /> : <SkeletonCircle size="header" />}
      <View style={styles.text} testID={identity ? undefined : "avatar-row-skeleton"}>
        {identity ? (
          <Text variant="rowTitle" numberOfLines={1}>
            {identity.title}
          </Text>
        ) : (
          <SkeletonBar text="rowTitle" width="rowTitle" />
        )}
        <Text variant="meta" tone="secondary">
          {subtitle}
        </Text>
      </View>
      <Icon name="chevronRight" size="md" tone="tertiary" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: layout.controlHeight,
    gap: layout.gap,
    paddingVertical: spacing.sm,
  },
  text: { flex: 1 },
  pressed: { opacity: motion.pressOpacity },
});

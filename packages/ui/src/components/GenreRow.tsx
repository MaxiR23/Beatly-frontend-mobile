// INFO: a genre row: the genre's palette bar, its name and a chevron.
import { Pressable, StyleSheet, View } from "react-native";

import { motion } from "../tokens/motion.ts";
import { radius } from "../tokens/radius.ts";
import { layout, spacing } from "../tokens/spacing.ts";
import { genreGradient } from "./genreGradient.ts";
import { GradientFill } from "./GradientFill.tsx";
import { Icon } from "./Icon.tsx";
import { Text } from "./Text.tsx";

interface GenreRowProps {
  slug: string;
  name: string;
  onPress: () => void;
}

export function GenreRow({ slug, name, onPress }: GenreRowProps) {
  const [from, via, to] = genreGradient(slug);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.bar}>
        <GradientFill colors={[from, via, to]} direction="vertical" />
      </View>
      <View style={styles.name}>
        <Text variant="display" numberOfLines={1}>
          {name}
        </Text>
      </View>
      <View testID="genre-row-chevron">
        <Icon name="chevronRight" size="md" tone="tertiary" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: layout.gap,
    paddingVertical: spacing.md,
    paddingHorizontal: layout.gutter,
  },
  bar: {
    width: layout.genreBarWidth,
    height: layout.genreBarHeight,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  name: { flex: 1 },
  pressed: { opacity: motion.pressOpacity },
});

// INFO: a segmented control: equal options in a pill, one selected; the caller passes the labels translated.
import { Pressable, StyleSheet, View } from "react-native";

import { color } from "../tokens/color.ts";
import { motion } from "../tokens/motion.ts";
import { radius } from "../tokens/radius.ts";
import { layout, spacing } from "../tokens/spacing.ts";
import { Text } from "./Text.tsx";

interface SegmentedControlProps<K extends string> {
  options: readonly { key: K; label: string }[];
  selected: K;
  onChange: (key: K) => void;
  testID?: string;
}

export function SegmentedControl<K extends string>({
  options,
  selected,
  onChange,
  testID,
}: SegmentedControlProps<K>) {
  return (
    <View accessibilityRole="tablist" style={styles.container} testID={testID}>
      {options.map((option) => {
        const isSelected = option.key === selected;
        return (
          <Pressable
            key={option.key}
            accessibilityRole="tab"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: isSelected }}
            onPress={() => {
              if (!isSelected) onChange(option.key);
            }}
            style={({ pressed }) => [
              styles.option,
              isSelected && styles.selected,
              pressed && styles.pressed,
            ]}
          >
            <Text variant="button" tone={isSelected ? "primary" : "secondary"}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    padding: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: color.overlay.subtle,
  },
  option: {
    flex: 1,
    height: layout.chipHeight,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  selected: { backgroundColor: color.overlay.muted },
  pressed: { opacity: motion.pressOpacity },
});

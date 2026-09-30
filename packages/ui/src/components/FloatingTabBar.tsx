// INFO: the floating tab bar for Android and iOS below 26: icon-only tabs
// on a GlassSurface pill, positioned above the bottom safe area, with an
// optional accessory (the mini player) above the pill at the pill's width.
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { color } from "../tokens/color.ts";
import { motion } from "../tokens/motion.ts";
import { radius } from "../tokens/radius.ts";
import { layout, spacing } from "../tokens/spacing.ts";
import { GlassSurface } from "./GlassSurface.tsx";
import { Icon, type IconName } from "./Icon.tsx";

interface FloatingTab {
  key: string;
  icon: IconName;
  label: string;
  selected: boolean;
  onPress: () => void;
}

interface FloatingTabBarProps {
  tabs: readonly FloatingTab[];
  bottomInset: number;
  accessory?: ReactNode;
}

// The width of the pill: the items, the bar variant's gaps and its padding.
export function floatingTabBarWidth(count: number): number {
  return count * layout.tabItemWidth + (count - 1) * spacing.xs + 2 * spacing.xs;
}

// The space a screen leaves at its bottom so its last item clears the bar:
// the bar's offset, its height and one section gap of air, plus the
// accessory's height and its `spacing.md` gap when there is one.
export function floatingTabBarClearance(bottomInset: number, accessory = false): number {
  return (
    bottomInset +
    spacing.sm +
    layout.controlHeight +
    2 * spacing.xs +
    spacing.xl +
    (accessory ? layout.controlHeight + 2 * spacing.xs + spacing.md : 0)
  );
}

export function FloatingTabBar({ tabs, bottomInset, accessory }: FloatingTabBarProps) {
  return (
    <View style={[styles.outer, { bottom: bottomInset + spacing.sm }]} pointerEvents="box-none">
      {accessory === undefined ? null : (
        <View
          style={[styles.accessory, { width: floatingTabBarWidth(tabs.length) }]}
          testID="tab-accessory"
        >
          {accessory}
        </View>
      )}
      <View accessibilityRole="tablist">
        <GlassSurface variant="bar">
          {tabs.map((tab) => (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: tab.selected }}
              onPress={tab.onPress}
              style={({ pressed }) => [
                styles.item,
                tab.selected && styles.selected,
                pressed && styles.pressed,
              ]}
            >
              <Icon name={tab.icon} size="lg" tone={tab.selected ? "primary" : "secondary"} />
            </Pressable>
          ))}
        </GlassSurface>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  accessory: { marginBottom: spacing.md },
  item: {
    width: layout.tabItemWidth,
    height: layout.controlHeight,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  selected: { backgroundColor: color.overlay.muted },
  pressed: { opacity: motion.pressOpacity },
});

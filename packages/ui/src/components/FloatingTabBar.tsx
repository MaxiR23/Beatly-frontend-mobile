// INFO: the floating tab bar for Android and iOS below 26: icon-only tabs
// spread evenly on a GlassSurface pill, positioned above the bottom safe area,
// with an optional accessory (the mini player) above it; both span the window
// minus the gutter on each side.
import type { ReactNode } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";

import { color } from "../tokens/color.ts";
import { radius } from "../tokens/radius.ts";
import { layout, spacing } from "../tokens/spacing.ts";
import { GlassSurface } from "./GlassSurface.tsx";
import { Icon, type IconName } from "./Icon.tsx";
import { pressFeedback } from "./pressFeedback.ts";

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
  const { width } = useWindowDimensions();
  const barWidth = width - 2 * layout.gutter;
  const press = pressFeedback();
  return (
    <View style={[styles.outer, { bottom: bottomInset + spacing.sm }]} pointerEvents="box-none">
      {accessory === undefined ? null : (
        <View style={[styles.accessory, { width: barWidth }]} testID="tab-accessory">
          {accessory}
        </View>
      )}
      <View accessibilityRole="tablist" style={{ width: barWidth }} testID="tab-pill">
        <GlassSurface variant="bar">
          {tabs.map((tab) => (
            <Pressable
              android_ripple={press.android_ripple}
              key={tab.key}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: tab.selected }}
              onPress={tab.onPress}
              style={({ pressed }) => [
                styles.item,
                tab.selected && styles.selected,
                press.style(pressed),
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
    flex: 1,
    height: layout.controlHeight,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  selected: { backgroundColor: color.overlay.muted },
});

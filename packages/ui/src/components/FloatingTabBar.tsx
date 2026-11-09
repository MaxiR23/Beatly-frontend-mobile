// INFO: the tab bar for Android and iOS below 26: on iOS below 26 icon-only tabs spread evenly on a GlassSurface pill above the bottom safe area with an optional accessory (the mini player) above it, both at the window width minus the gutter on each side; on Android (ADR 035) one block docked to the bottom edge, full width, with the tab row and the bottom inset on the opaque base surface and a fade into it above them, icon and name per tab, the accessory inside the block; dockedTabBarHeight is the one source of the Android block's height and clearance.
import type { ReactNode } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";

import { color } from "../tokens/color.ts";
import { icon } from "../tokens/icon.ts";
import { radius } from "../tokens/radius.ts";
import { layout, spacing } from "../tokens/spacing.ts";
import { typography } from "../tokens/typography.ts";
import { GlassSurface } from "./GlassSurface.tsx";
import { GradientFill } from "./GradientFill.tsx";
import { Icon, type IconName } from "./Icon.tsx";
import { isAndroidVariant } from "./platform.ts";
import { pressFeedback } from "./pressFeedback.ts";
import { Text } from "./Text.tsx";

interface FloatingTab {
  key: string;
  icon: IconName;
  label: string;
  selected: boolean;
  // Android: the tab's glyph has a filled form (Home), drawn when selected; the iOS pill ignores it.
  fillWhenSelected?: boolean;
  onPress: () => void;
}

interface FloatingTabBarProps {
  tabs: readonly FloatingTab[];
  bottomInset: number;
  accessory?: ReactNode;
}

// The gap between the accessory (the mini player) and the pill; the style and the clearance read it.
const ACCESSORY_GAP = spacing.xs;

// The mini player's content height plus its surface padding.
const ACCESSORY_HEIGHT = layout.controlHeight + 2 * spacing.xs;

// The Android tab row: padding, icon, gap, label line and padding (at least layout.controlHeight).
const TAB_ROW_HEIGHT =
  spacing.sm + icon.size.lg + spacing.xs + typography.tabLabelSelected.lineHeight + spacing.sm;

// The fade zone above the Android block's top element: one section gap of air.
const DOCK_FADE = spacing.xl;

// The Android block's height, the one source of its layout and of the screens' clearance: the fade zone, the accessory and its gap when there is one, the tab row and the bottom inset.
export function dockedTabBarHeight(bottomInset: number, accessory = false): number {
  return (
    DOCK_FADE + (accessory ? ACCESSORY_HEIGHT + ACCESSORY_GAP : 0) + TAB_ROW_HEIGHT + bottomInset
  );
}

// The space a screen leaves at its bottom so its last item clears the bar. On
// Android the docked block's height (the last item rests at the fade's top);
// elsewhere the bar's offset, its height and one section gap of air, plus the
// accessory's height and its gap when there is one.
export function floatingTabBarClearance(bottomInset: number, accessory = false): number {
  if (isAndroidVariant()) return dockedTabBarHeight(bottomInset, accessory);
  return (
    bottomInset +
    spacing.sm +
    layout.controlHeight +
    2 * spacing.xs +
    spacing.xl +
    (accessory ? layout.controlHeight + 2 * spacing.xs + ACCESSORY_GAP : 0)
  );
}

export function FloatingTabBar(props: FloatingTabBarProps) {
  return isAndroidVariant() ? <DockedTabBar {...props} /> : <PillTabBar {...props} />;
}

function PillTabBar({ tabs, bottomInset, accessory }: FloatingTabBarProps) {
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

// The fade covers only the zone above the tab row; the tab row and the inset sit on the opaque base surface.
// Deliberate departures from Material 3 (ADR 035): no indicator, no surface of its own, the fade on press, the heavier selected label.
function DockedTabBar({ tabs, bottomInset, accessory }: FloatingTabBarProps) {
  const press = pressFeedback({ android: "fade" });
  return (
    <View
      style={[styles.dock, { height: dockedTabBarHeight(bottomInset, accessory !== undefined) }]}
      pointerEvents="box-none"
      testID="tab-dock"
    >
      <View
        pointerEvents="none"
        style={[styles.fade, { bottom: bottomInset + TAB_ROW_HEIGHT }]}
        testID="tab-dock-fade"
      >
        <GradientFill direction="vertical" colors={[color.overlay.clear, color.surface.base]} />
      </View>
      <View
        pointerEvents="none"
        style={[styles.baseFill, { height: TAB_ROW_HEIGHT + bottomInset }]}
        testID="tab-dock-base"
      />
      <View style={{ paddingBottom: bottomInset }}>
        {accessory === undefined ? null : (
          <View style={styles.dockAccessory} testID="tab-accessory">
            {accessory}
          </View>
        )}
        <View accessibilityRole="tablist" style={styles.dockRow} testID="tab-row">
          {tabs.map((tab) => (
            <Pressable
              android_ripple={press.android_ripple}
              key={tab.key}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: tab.selected }}
              onPress={tab.onPress}
              style={({ pressed }) => [styles.dockTab, press.style(pressed)]}
            >
              <Icon
                name={tab.icon}
                size="lg"
                tone={tab.selected ? "primary" : "secondary"}
                filled={tab.selected && tab.fillWhenSelected === true}
              />
              <Text
                variant={tab.selected ? "tabLabelSelected" : "meta"}
                tone={tab.selected ? "primary" : "secondary"}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>
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
  accessory: { marginBottom: ACCESSORY_GAP },
  item: {
    flex: 1,
    height: layout.controlHeight,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  selected: { backgroundColor: color.overlay.muted },
  dock: { position: "absolute", left: 0, right: 0, bottom: 0, justifyContent: "flex-end" },
  fade: { position: "absolute", top: 0, left: 0, right: 0, overflow: "hidden" },
  baseFill: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: color.surface.base,
  },
  dockAccessory: { marginHorizontal: spacing.sm, marginBottom: ACCESSORY_GAP },
  dockRow: { flexDirection: "row" },
  dockTab: {
    flex: 1,
    height: TAB_ROW_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
});

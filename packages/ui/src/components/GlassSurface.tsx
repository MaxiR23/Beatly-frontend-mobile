// INFO: the only importer of expo-glass-effect: native glass on iOS 26+, a
// solid raised surface elsewhere; every floating surface is drawn with it.
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import type { ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { border } from "../tokens/border.ts";
import { color } from "../tokens/color.ts";
import { radius } from "../tokens/radius.ts";
import { shadow } from "../tokens/shadow.ts";
import { spacing } from "../tokens/spacing.ts";

interface GlassSurfaceProps {
  variant: "bar" | "sheet";
  children: ReactNode;
  testID?: string;
}

// The single platform test: native glass exists on iOS 26 and later only.
export function isGlassAvailable(): boolean {
  return Platform.OS === "ios" && isLiquidGlassAvailable();
}

export function GlassSurface({ variant, children, testID }: GlassSurfaceProps) {
  const shape = styles[variant];

  if (isGlassAvailable()) {
    return (
      <GlassView glassEffectStyle="regular" style={shape} testID={testID}>
        {children}
      </GlassView>
    );
  }

  return (
    <View style={[shape, styles.fallback]} testID={testID}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderRadius: radius.full,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  sheet: {
    alignSelf: "stretch",
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  fallback: {
    backgroundColor: color.surface.raised,
    borderWidth: border.width,
    borderColor: color.surface.border,
    ...shadow.floating,
  },
});

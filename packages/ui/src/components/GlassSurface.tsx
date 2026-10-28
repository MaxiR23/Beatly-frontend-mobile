// INFO: the only importer of expo-glass-effect: native glass on iOS 26+, a
// solid raised surface elsewhere; every floating surface is drawn with it.
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import type { ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { border } from "../tokens/border.ts";
import { color } from "../tokens/color.ts";
import { radius } from "../tokens/radius.ts";
import { shadow } from "../tokens/shadow.ts";
import { layout, spacing } from "../tokens/spacing.ts";
import { ColorFade } from "./ColorFade.tsx";

interface GlassSurfaceProps {
  variant: "bar" | "sheet" | "circle";
  children: ReactNode;
  // A runtime color (a cover's color from the backend) over the surface; null or unset keeps it neutral.
  tint?: string | null;
  // The tint fades in when it arrives after mount, unless this is on.
  reduceMotion?: boolean;
  testID?: string;
}

// The glass test: native glass exists on iOS 26 and later only; the Android branches use isAndroidVariant (ADR 027).
export function isGlassAvailable(): boolean {
  return Platform.OS === "ios" && isLiquidGlassAvailable();
}

export function GlassSurface({
  variant,
  children,
  tint,
  reduceMotion = false,
  testID,
}: GlassSurfaceProps) {
  const shape = styles[variant];

  if (isGlassAvailable()) {
    return (
      <GlassView
        glassEffectStyle="regular"
        style={shape}
        {...(typeof tint === "string" ? { tintColor: tint } : {})}
        testID={testID}
      >
        {children}
      </GlassView>
    );
  }

  return (
    <View style={[shape, styles.fallback]} testID={testID}>
      <ColorFade
        color={tint ?? null}
        reduceMotion={reduceMotion}
        style={[StyleSheet.absoluteFill, { borderRadius: shape.borderRadius }]}
        testID={testID === undefined ? undefined : `${testID}-tint`}
      >
        {(c) => (
          <View
            style={[
              StyleSheet.absoluteFill,
              { borderRadius: shape.borderRadius, backgroundColor: c },
            ]}
          />
        )}
      </ColorFade>
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
    flexShrink: 1,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  circle: {
    width: layout.controlHeight,
    height: layout.controlHeight,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  fallback: {
    backgroundColor: color.surface.raised,
    borderWidth: border.width,
    borderColor: color.surface.border,
    ...shadow.floating,
  },
});

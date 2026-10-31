// INFO: the Beatly logo: five round accent bars of the legacy mark's geometry (layout.logoBars) in an icon.size.hero box, each rising and falling on its own motion.logo duration down to motion.logo.minScale on the native driver; at rest, every bar full, under reduce motion; decorative.
import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

import { color } from "../tokens/color.ts";
import { icon } from "../tokens/icon.ts";
import { motion } from "../tokens/motion.ts";
import { radius } from "../tokens/radius.ts";
import { layout } from "../tokens/spacing.ts";

interface BeatlyLogoProps {
  reduceMotion: boolean;
  testID?: string;
}

const SIDE = icon.size.hero;
const UNIT = SIDE / layout.logoBars.units;

export function BeatlyLogo({ reduceMotion, testID }: BeatlyLogoProps) {
  const [scales] = useState(() => layout.logoBars.lengths.map(() => new Animated.Value(1)));
  useEffect(() => {
    if (reduceMotion) {
      scales.forEach((scale) => {
        scale.setValue(1);
      });
      return;
    }
    const loops = scales.map((scale, index) => {
      const duration = motion.logo.durations[index] ?? motion.duration.base;
      return Animated.loop(
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1,
            duration,
            easing: (t) => Easing.linear(t),
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: motion.logo.minScale,
            duration,
            easing: (t) => Easing.linear(t),
            useNativeDriver: true,
          }),
        ]),
      );
    });
    loops.forEach((loop) => {
      loop.start();
    });
    return () => {
      loops.forEach((loop) => {
        loop.stop();
      });
    };
  }, [scales, reduceMotion]);
  return (
    <View style={styles.box} accessible={false} testID={testID}>
      {scales.map((scale, index) => (
        <Animated.View
          key={`bar-${String(index)}`}
          style={[
            styles.bar,
            {
              // A round cap adds half the stroke at each end of the line.
              height: ((layout.logoBars.lengths[index] ?? 0) + layout.logoBars.width) * UNIT,
              transform: [{ scaleY: scale }],
            },
          ]}
          testID="logo-bar"
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: SIDE,
    height: SIDE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: (layout.logoBars.pitch - layout.logoBars.width) * UNIT,
  },
  bar: {
    width: layout.logoBars.width * UNIT,
    borderRadius: radius.full,
    backgroundColor: color.accent.primary,
  },
});

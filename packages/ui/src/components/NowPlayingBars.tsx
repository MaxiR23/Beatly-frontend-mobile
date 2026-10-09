// INFO: three bars rising and falling out of phase while playing, frozen where they stand while paused, at fixed heights under reduce motion; decorative.
import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

import { color } from "../tokens/color.ts";
import { icon } from "../tokens/icon.ts";
import { motion } from "../tokens/motion.ts";
import { layout, spacing } from "../tokens/spacing.ts";

interface NowPlayingBarsProps {
  state: "playing" | "paused";
  reduceMotion: boolean;
  testID?: string;
}

export function NowPlayingBars({ state, reduceMotion, testID }: NowPlayingBarsProps) {
  const [scales] = useState(() =>
    motion.nowPlaying.staticScales.map((initial) => new Animated.Value(initial)),
  );
  useEffect(() => {
    if (reduceMotion) {
      scales.forEach((scale, index) => {
        scale.setValue(motion.nowPlaying.staticScales[index] ?? 1);
      });
      return;
    }
    if (state !== "playing") return;
    const loops = scales.map((scale, index) => {
      const duration = motion.nowPlaying.durations[index] ?? motion.duration.base;
      return Animated.loop(
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1,
            duration,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: motion.nowPlaying.minScale,
            duration,
            easing: Easing.linear,
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
  }, [scales, state, reduceMotion]);
  return (
    <View style={styles.box} accessible={false} testID={testID}>
      {scales.map((scale, index) => (
        <Animated.View
          key={`bar-${String(index)}`}
          style={[styles.bar, { transform: [{ scaleY: scale }] }]}
          testID="now-playing-bar"
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: icon.size.sm,
    height: icon.size.sm,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.xxs,
  },
  bar: {
    width: layout.nowPlayingBarWidth,
    height: icon.size.sm,
    backgroundColor: color.accent.primary,
    transformOrigin: "bottom",
  },
});

// INFO: a one-line text that scrolls to its end and back, resting at each end, only when it does not fit its container; under reduce motion it is a static line with a tail ellipsis.
import { useEffect, useState } from "react";
import { Animated, Easing, ScrollView, StyleSheet, View } from "react-native";

import { motion } from "../tokens/motion.ts";
import type { typography } from "../tokens/typography.ts";
import { Text } from "./Text.tsx";
import type { Tone } from "./tone.ts";

interface MarqueeProps {
  text: string;
  variant: keyof typeof typography;
  tone?: Tone;
  reduceMotion: boolean;
  testID?: string;
}

export function Marquee({ text, variant, tone = "primary", reduceMotion, testID }: MarqueeProps) {
  const [translateX] = useState(() => new Animated.Value(0));
  const [containerWidth, setContainerWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const overflow = textWidth - containerWidth;
  const scrolls = !reduceMotion && containerWidth > 0 && overflow > 0;

  useEffect(() => {
    if (!scrolls) return;
    const duration = (overflow / motion.marquee.speed) * 1000;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(motion.marquee.pause),
        Animated.timing(translateX, {
          toValue: -overflow,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.delay(motion.marquee.pause),
        Animated.timing(translateX, {
          toValue: 0,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => {
      animation.stop();
      translateX.setValue(0);
    };
  }, [scrolls, overflow, text, translateX]);

  if (reduceMotion) {
    return (
      <View testID={testID}>
        <Text variant={variant} tone={tone} numberOfLines={1}>
          {text}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={styles.clip}
      onLayout={(event) => {
        setContainerWidth(event.nativeEvent.layout.width);
      }}
      testID={testID}
    >
      <ScrollView horizontal scrollEnabled={false} showsHorizontalScrollIndicator={false}>
        <Animated.View
          style={{ transform: [{ translateX }] }}
          {...(testID !== undefined ? { testID: `${testID}-text` } : {})}
          onLayout={(event) => {
            setTextWidth(event.nativeEvent.layout.width);
          }}
        >
          <Text variant={variant} tone={tone}>
            {text}
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: "hidden" },
});

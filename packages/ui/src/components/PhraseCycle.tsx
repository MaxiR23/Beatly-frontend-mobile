// INFO: a centered secondary line that advances through its phrases every motion.duration.phrase, fading out and in over motion.duration.base on the native driver, and stays on the last; under reduce motion it shows the first phrase and never advances.
import { useEffect, useState } from "react";
import { Animated } from "react-native";

import { motion } from "../tokens/motion.ts";
import { Text } from "./Text.tsx";

interface PhraseCycleProps {
  phrases: readonly string[];
  reduceMotion: boolean;
  testID?: string;
}

export function PhraseCycle({ phrases, reduceMotion, testID }: PhraseCycleProps) {
  const [index, setIndex] = useState(0);
  const [opacity] = useState(() => new Animated.Value(1));
  const last = phrases.length - 1;

  useEffect(() => {
    if (reduceMotion) return;
    let fadeIn: Animated.CompositeAnimation | null = null;
    let fadeOut: Animated.CompositeAnimation | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    // After a fade-out the opacity is 0: the phrase of this index fades in from here.
    if (index > 0) {
      fadeIn = Animated.timing(opacity, {
        toValue: 1,
        duration: motion.duration.base,
        useNativeDriver: true,
      });
      fadeIn.start();
    }
    if (index < last) {
      timer = setTimeout(() => {
        fadeOut = Animated.timing(opacity, {
          toValue: 0,
          duration: motion.duration.base,
          useNativeDriver: true,
        });
        fadeOut.start(() => {
          setIndex(index + 1);
        });
      }, motion.duration.phrase);
    }
    return () => {
      if (timer !== null) clearTimeout(timer);
      fadeOut?.stop();
      fadeIn?.stop();
    };
  }, [index, last, reduceMotion, opacity]);

  return (
    <Animated.View style={{ opacity }} testID={testID}>
      <Text variant="body" tone="secondary" align="center">
        {phrases[index] ?? ""}
      </Text>
    </Animated.View>
  );
}

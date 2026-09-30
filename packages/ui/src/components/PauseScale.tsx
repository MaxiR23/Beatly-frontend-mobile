// INFO: scales its children down to motion.pausedScale while paused and back to full size, with the one spring; under reduce motion it stays full size.
import { useEffect, useState, type ReactNode } from "react";
import { Animated } from "react-native";

import { motion } from "../tokens/motion.ts";

interface PauseScaleProps {
  paused: boolean;
  reduceMotion: boolean;
  children: ReactNode;
  testID?: string;
}

export function PauseScale({ paused, reduceMotion, children, testID }: PauseScaleProps) {
  const target = paused && !reduceMotion ? motion.pausedScale : 1;
  const [scale] = useState(() => new Animated.Value(target));
  useEffect(() => {
    if (reduceMotion) {
      scale.setValue(1);
      return;
    }
    Animated.spring(scale, {
      toValue: target,
      damping: motion.spring.damping,
      stiffness: motion.spring.stiffness,
      useNativeDriver: true,
    }).start();
  }, [scale, target, reduceMotion]);
  return (
    <Animated.View style={{ transform: [{ scale }] }} testID={testID}>
      {children}
    </Animated.View>
  );
}

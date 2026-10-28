// INFO: a colored layer over the neutral surface under it: nothing while color is null; at full opacity when the color is there at mount, changes from one color to another, or reduce motion is on; fading in on the native driver over motion.duration.base when the color goes from null to a value after mount.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, type StyleProp, type ViewStyle } from "react-native";

import { motion } from "../tokens/motion.ts";

interface ColorFadeProps {
  color: string | null;
  reduceMotion: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string | undefined;
  children: (color: string) => ReactNode;
}

export function ColorFade({ color, reduceMotion, style, testID, children }: ColorFadeProps) {
  const [opacity] = useState(() => new Animated.Value(color === null ? 0 : 1));
  const previous = useRef(color);
  useEffect(() => {
    const from = previous.current;
    previous.current = color;
    if (color === null) {
      opacity.setValue(0);
      return;
    }
    if (from !== null || reduceMotion) {
      opacity.setValue(1);
      return;
    }
    const run = Animated.timing(opacity, {
      toValue: 1,
      duration: motion.duration.base,
      useNativeDriver: true,
    });
    run.start();
    return () => {
      run.stop();
    };
  }, [color, reduceMotion, opacity]);
  if (color === null) return null;
  return (
    <Animated.View pointerEvents="none" style={[style, { opacity }]} testID={testID}>
      {children(color)}
    </Animated.View>
  );
}

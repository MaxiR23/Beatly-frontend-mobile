// INFO: its children enter one after the other, each from opacity 0 and motion.detailCascade.offset lower, in motion.detailCascade.duration, motion.detailCascade.stagger apart, on the native driver, once at mount; at rest from the first frame under reduce motion.
import { Children, useEffect, useState, type ReactNode } from "react";
import { Animated } from "react-native";

import { motion } from "../tokens/motion.ts";

interface CascadeProps {
  reduceMotion: boolean;
  children: ReactNode;
}

export function Cascade({ reduceMotion, children }: CascadeProps) {
  const items = Children.toArray(children);
  const count = items.length;
  const [values] = useState(() => items.map(() => new Animated.Value(reduceMotion ? 1 : 0)));

  useEffect(() => {
    if (reduceMotion) {
      values.forEach((value) => {
        value.setValue(1);
      });
      return;
    }
    const runs = values.map((value, index) =>
      Animated.timing(value, {
        toValue: 1,
        duration: motion.detailCascade.duration,
        delay: index * motion.detailCascade.stagger,
        useNativeDriver: true,
      }),
    );
    runs.forEach((run) => {
      run.start();
    });
    return () => {
      runs.forEach((run) => {
        run.stop();
      });
    };
  }, [values, reduceMotion, count]);

  return (
    <>
      {items.map((child, index) => {
        const value = values[index];
        return (
          <Animated.View
            key={`step-${String(index)}`}
            testID="cascade-step"
            style={
              value
                ? {
                    opacity: value,
                    transform: [
                      {
                        translateY: value.interpolate({
                          inputRange: [0, 1],
                          outputRange: [motion.detailCascade.offset, 0],
                        }),
                      },
                    ],
                  }
                : undefined
            }
          >
            {child}
          </Animated.View>
        );
      })}
    </>
  );
}

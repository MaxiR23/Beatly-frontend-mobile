// INFO: a container a downward drag moves and closes: it takes a mostly vertical downward drag past motion.dragToClose.slop while enabled, follows the finger down, springs back with the one spring below the threshold and calls onClose past it or on a fast flick; under reduce motion it does not move; the assistive escape closes too.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, PanResponder, StyleSheet, useWindowDimensions } from "react-native";

import { motion } from "../tokens/motion.ts";

interface DragToCloseProps {
  onClose: () => void;
  enabled: boolean;
  reduceMotion: boolean;
  children: ReactNode;
  testID?: string;
}

export function DragToClose({
  onClose,
  enabled,
  reduceMotion,
  children,
  testID,
}: DragToCloseProps) {
  const { height } = useWindowDimensions();
  const [offset] = useState(() => new Animated.Value(0));
  const latest = useRef({ onClose, enabled, reduceMotion, height });
  useEffect(() => {
    latest.current = { onClose, enabled, reduceMotion, height };
  });
  const closed = useRef(false);
  const [responder] = useState(() => {
    const settle = () => {
      if (latest.current.reduceMotion) {
        offset.setValue(0);
        return;
      }
      Animated.spring(offset, {
        toValue: 0,
        damping: motion.spring.damping,
        stiffness: motion.spring.stiffness,
        useNativeDriver: true,
      }).start();
    };
    return PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_event, gesture) =>
        !closed.current &&
        latest.current.enabled &&
        gesture.dy > motion.dragToClose.slop &&
        gesture.dy > Math.abs(gesture.dx),
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_event, gesture) => {
        if (!latest.current.reduceMotion) offset.setValue(Math.max(0, gesture.dy));
      },
      onPanResponderRelease: (_event, gesture) => {
        const past =
          gesture.dy > latest.current.height * motion.dragToClose.distanceShare ||
          gesture.vy > motion.dragToClose.velocity;
        if (past) {
          closed.current = true;
          latest.current.onClose();
        } else {
          settle();
        }
      },
      onPanResponderTerminate: settle,
    });
  });
  return (
    <Animated.View
      style={[styles.fill, { transform: [{ translateY: offset }] }]}
      onAccessibilityEscape={onClose}
      testID={testID}
      {...responder.panHandlers}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});

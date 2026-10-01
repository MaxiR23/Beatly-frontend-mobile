// INFO: the one vertical drag: while enabled it takes a mostly vertical drag in its direction past motion.dragToClose.slop, moves the caller's position away from rest with the finger (never past rest), springs it back to rest with the one spring when released short or taken away, and calls onCommit past motion.dragToClose.distanceShare of the window height or on a flick faster than motion.dragToClose.velocity, leaving the position where the finger left it; onSettle tells the caller the spring back to rest ended (not a cut one, not a commit), and under reduce motion it moves nothing, fires onSettle right away on a cancelled release and still commits.
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  PanResponder,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { motion } from "../tokens/motion.ts";

interface VerticalDragProps {
  direction: "down" | "up";
  position: Animated.Value;
  rest: number;
  enabled: boolean;
  reduceMotion: boolean;
  onCommit: () => void;
  onDragStart?: (() => void) | undefined;
  onSettle?: (() => void) | undefined;
  children: ReactNode;
  style?: StyleProp<Animated.WithAnimatedValue<ViewStyle>>;
  onAccessibilityEscape?: (() => void) | undefined;
  testID?: string | undefined;
}

export function VerticalDrag({
  direction,
  position,
  rest,
  enabled,
  reduceMotion,
  onCommit,
  onDragStart,
  onSettle,
  children,
  style,
  onAccessibilityEscape,
  testID,
}: VerticalDragProps) {
  const { height } = useWindowDimensions();
  const latest = useRef({
    direction,
    position,
    rest,
    enabled,
    reduceMotion,
    onCommit,
    onDragStart,
    onSettle,
    height,
  });
  useEffect(() => {
    latest.current = {
      direction,
      position,
      rest,
      enabled,
      reduceMotion,
      onCommit,
      onDragStart,
      onSettle,
      height,
    };
  });
  const [responder] = useState(() => {
    const along = (distance: number): number =>
      latest.current.direction === "down" ? distance : -distance;
    const settle = () => {
      const { position: value, rest: at } = latest.current;
      if (latest.current.reduceMotion) {
        value.setValue(at);
        latest.current.onSettle?.();
        return;
      }
      Animated.spring(value, {
        toValue: at,
        damping: motion.spring.damping,
        stiffness: motion.spring.stiffness,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) latest.current.onSettle?.();
      });
    };
    return PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_event, gesture) =>
        latest.current.enabled &&
        along(gesture.dy) > motion.dragToClose.slop &&
        Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderGrant: () => {
        latest.current.onDragStart?.();
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_event, gesture) => {
        if (latest.current.reduceMotion) return;
        const travel = Math.max(0, along(gesture.dy));
        const { position: value, rest: at } = latest.current;
        value.setValue(latest.current.direction === "down" ? at + travel : at - travel);
      },
      onPanResponderRelease: (_event, gesture) => {
        const past =
          along(gesture.dy) > latest.current.height * motion.dragToClose.distanceShare ||
          along(gesture.vy) > motion.dragToClose.velocity;
        if (past) {
          latest.current.onCommit();
        } else {
          settle();
        }
      },
      onPanResponderTerminate: settle,
    });
  });
  return (
    <Animated.View
      style={style}
      onAccessibilityEscape={onAccessibilityEscape}
      testID={testID}
      {...responder.panHandlers}
    >
      {children}
    </Animated.View>
  );
}

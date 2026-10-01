// INFO: a container a downward drag moves and closes, over VerticalDrag: it takes a mostly vertical downward drag past motion.dragToClose.slop while enabled, follows the finger down, springs back with the one spring below the threshold and calls onClose past it or on a fast flick; under reduce motion it does not move; the assistive escape closes too.
import { useState, type ReactNode } from "react";
import { Animated, StyleSheet } from "react-native";

import { VerticalDrag } from "./VerticalDrag.tsx";

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
  const [offset] = useState(() => new Animated.Value(0));
  const [closed, setClosed] = useState(false);
  return (
    <VerticalDrag
      direction="down"
      position={offset}
      rest={0}
      enabled={enabled && !closed}
      reduceMotion={reduceMotion}
      onCommit={() => {
        setClosed(true);
        onClose();
      }}
      style={[styles.fill, { transform: [{ translateY: offset }] }]}
      onAccessibilityEscape={onClose}
      testID={testID}
    >
      {children}
    </VerticalDrag>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});

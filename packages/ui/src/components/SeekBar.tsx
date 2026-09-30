// INFO: a seek bar: a track, a fill, a thumb and the elapsed and remaining labels; a press or a drag seeks on release; the labels arrive translated; the touch target is taller than the bar.
import { useState } from "react";
import { StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from "react-native";

import { color } from "../tokens/color.ts";
import { radius } from "../tokens/radius.ts";
import { shadow } from "../tokens/shadow.ts";
import { layout, spacing } from "../tokens/spacing.ts";
import { Text } from "./Text.tsx";

// Seconds an assistive increment or decrement moves the position.
const ACCESSIBILITY_STEP_SECONDS = 10;

interface SeekBarProps {
  positionSeconds: number;
  durationSeconds: number;
  elapsedLabel: string;
  remainingLabel: string;
  accessibilityLabel: string;
  onSeek: (seconds: number) => void;
}

// The bar is thinner than a touch target: the slop restores the control height.
const touchSlop = {
  top: (layout.controlHeight - layout.seekThumb) / 2,
  bottom: (layout.controlHeight - layout.seekThumb) / 2,
};

const clamp = (fraction: number): number => Math.min(1, Math.max(0, fraction));

export function SeekBar({
  positionSeconds,
  durationSeconds,
  elapsedLabel,
  remainingLabel,
  accessibilityLabel,
  onSeek,
}: SeekBarProps) {
  const [width, setWidth] = useState(0);
  const [drag, setDrag] = useState<number | null>(null);

  const fractionAt = (event: GestureResponderEvent): number =>
    width > 0 ? clamp(event.nativeEvent.locationX / width) : 0;
  const played = durationSeconds > 0 ? clamp(positionSeconds / durationSeconds) : 0;
  const shown = drag ?? played;
  const seekBy = (delta: number): void => {
    onSeek(Math.min(durationSeconds, Math.max(0, positionSeconds + delta)));
  };

  return (
    <View>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ min: 0, max: durationSeconds, now: positionSeconds }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === "increment") seekBy(ACCESSIBILITY_STEP_SECONDS);
          if (event.nativeEvent.actionName === "decrement") seekBy(-ACCESSIBILITY_STEP_SECONDS);
        }}
        onLayout={(event: LayoutChangeEvent) => {
          setWidth(event.nativeEvent.layout.width);
        }}
        hitSlop={touchSlop}
        onResponderTerminationRequest={() => false}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(event) => {
          setDrag(fractionAt(event));
        }}
        onResponderMove={(event) => {
          setDrag(fractionAt(event));
        }}
        onResponderRelease={(event) => {
          setDrag(null);
          onSeek(fractionAt(event) * durationSeconds);
        }}
        onResponderTerminate={() => {
          setDrag(null);
        }}
        style={styles.touch}
        testID="seek-touch"
      >
        <View style={styles.track} pointerEvents="none">
          <View style={[styles.fill, { width: shown * width }]} testID="seek-fill" />
        </View>
        <View
          pointerEvents="none"
          style={[styles.thumb, { left: shown * width - layout.seekThumb / 2 }]}
          testID="seek-thumb"
        />
      </View>
      <View style={styles.times}>
        <Text variant="meta" tone="secondary">
          {elapsedLabel}
        </Text>
        <Text variant="meta" tone="secondary">
          {remainingLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  touch: { height: layout.seekThumb, justifyContent: "center" },
  track: {
    height: layout.seekTrack,
    borderRadius: radius.full,
    backgroundColor: color.overlay.muted,
    overflow: "hidden",
  },
  fill: { height: layout.seekTrack, backgroundColor: color.text.primary },
  thumb: {
    position: "absolute",
    top: 0,
    width: layout.seekThumb,
    height: layout.seekThumb,
    borderRadius: radius.full,
    backgroundColor: color.accent.primary,
    ...shadow.control,
  },
  times: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.sm },
});

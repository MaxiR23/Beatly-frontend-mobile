// INFO: a labeled switch with a helper line under the label. iOS draws React Native's Switch with token colors; on Android it is the Material 3 switch (ADR 027): a track outlined with a small thumb when off, filled with the accent and a large thumb when on, the thumb sliding and growing on the native driver (at once under reduce motion) and growing further while pressed, with the shared ripple bounded to the track.
import { useLayoutEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Switch, View } from "react-native";

import { border } from "../tokens/border.ts";
import { color } from "../tokens/color.ts";
import { motion } from "../tokens/motion.ts";
import { radius } from "../tokens/radius.ts";
import { layout, spacing } from "../tokens/spacing.ts";
import { isAndroidVariant } from "./platform.ts";
import { pressFeedback } from "./pressFeedback.ts";
import { Text } from "./Text.tsx";

interface SwitchRowProps {
  label: string;
  helper: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  // On Android: the thumb moves without an animation; iOS ignores it.
  reduceMotion: boolean;
}

// How far the thumb's center travels from off to on.
const travel = layout.switchTrackWidthAndroid - layout.switchTrackHeightAndroid;

// The thumb is drawn at its pressed size and scaled down to the off or on size.
function thumbScale(on: boolean, pressed: boolean): number {
  if (pressed) return 1;
  return (
    (on ? layout.switchThumbOnAndroid : layout.switchThumbOffAndroid) /
    layout.switchThumbPressedAndroid
  );
}

// Inside the border: centers the pressed-size thumb on the track's height, at the start.
const thumbInset =
  (layout.switchTrackHeightAndroid - layout.switchThumbPressedAndroid) / 2 - border.widthFocused;

interface AndroidSwitchProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  reduceMotion: boolean;
}

function AndroidSwitch({ label, value, onValueChange, reduceMotion }: AndroidSwitchProps) {
  const press = pressFeedback({ on: value ? "accent" : "surface", shape: "round" });
  const [pressed, setPressed] = useState(false);
  const [position] = useState(() => new Animated.Value(value ? 1 : 0));
  const [size] = useState(() => new Animated.Value(thumbScale(value, false)));
  const placed = useRef(false);

  useLayoutEffect(() => {
    const scale = thumbScale(value, pressed);
    if (!placed.current || reduceMotion) {
      position.setValue(value ? 1 : 0);
      size.setValue(scale);
      placed.current = true;
      return;
    }
    const move = Animated.parallel([
      Animated.timing(position, {
        toValue: value ? 1 : 0,
        duration: motion.duration.base,
        useNativeDriver: true,
      }),
      Animated.timing(size, {
        toValue: scale,
        duration: motion.duration.base,
        useNativeDriver: true,
      }),
    ]);
    move.start();
    return () => {
      move.stop();
    };
  }, [position, size, value, pressed, reduceMotion]);

  const translateX = position.interpolate({ inputRange: [0, 1], outputRange: [0, travel] });

  return (
    <Pressable
      android_ripple={press.android_ripple}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      hitSlop={layout.hitSlop}
      onPress={() => {
        onValueChange(!value);
      }}
      onPressIn={() => {
        setPressed(true);
      }}
      onPressOut={() => {
        setPressed(false);
      }}
      testID="switch-track"
      style={({ pressed: down }) => [
        styles.track,
        value ? styles.trackOn : styles.trackOff,
        press.style(down),
      ]}
    >
      <Animated.View
        pointerEvents="none"
        testID="switch-thumb"
        style={[
          styles.thumb,
          value ? styles.thumbOn : styles.thumbOff,
          { transform: [{ translateX }, { scale: size }] },
        ]}
      />
    </Pressable>
  );
}

export function SwitchRow({ label, helper, value, onValueChange, reduceMotion }: SwitchRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text variant="body">{label}</Text>
        <Text variant="meta" tone="secondary">
          {helper}
        </Text>
      </View>
      {isAndroidVariant() ? (
        <AndroidSwitch
          label={label}
          value={value}
          onValueChange={onValueChange}
          reduceMotion={reduceMotion}
        />
      ) : (
        <Switch
          value={value}
          onValueChange={onValueChange}
          accessibilityLabel={label}
          trackColor={{ false: color.surface.border, true: color.accent.primary }}
          thumbColor={value ? color.text.inverse : color.text.primary}
          ios_backgroundColor={color.surface.border}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: layout.gap },
  text: { flex: 1, gap: spacing.xxs },
  track: {
    width: layout.switchTrackWidthAndroid,
    height: layout.switchTrackHeightAndroid,
    borderRadius: radius.full,
    borderWidth: border.widthFocused,
  },
  trackOff: { backgroundColor: color.surface.control, borderColor: color.surface.border },
  trackOn: { backgroundColor: color.accent.primary, borderColor: color.accent.primary },
  thumb: {
    position: "absolute",
    top: thumbInset,
    left: thumbInset,
    width: layout.switchThumbPressedAndroid,
    height: layout.switchThumbPressedAndroid,
    borderRadius: radius.full,
  },
  thumbOff: { backgroundColor: color.text.primary },
  thumbOn: { backgroundColor: color.text.inverse },
});

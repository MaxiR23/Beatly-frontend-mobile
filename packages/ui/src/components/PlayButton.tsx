// INFO: the detail play button, with four states: idle is an accent pill with the play glyph and a label; loading, playing and paused are a circle with a spinner, the pause glyph or the play glyph. Leaving idle the pill shrinks to the circle in motion.duration.fast, and becoming pause the circle scales in from motion.enterScale; under reduce motion neither animates. Disabled greys it out and ignores presses; loading ignores them too.
import { useLayoutEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from "react-native";

import { color } from "../tokens/color.ts";
import { motion } from "../tokens/motion.ts";
import { radius } from "../tokens/radius.ts";
import { layout, spacing } from "../tokens/spacing.ts";
import { Icon } from "./Icon.tsx";
import { Text } from "./Text.tsx";
import { toneColor, type Tone } from "./tone.ts";

export type PlayButtonState = "idle" | "loading" | "playing" | "paused";

interface PlayButtonProps {
  state: PlayButtonState;
  // The idle pill's text, and the accessibility label in every state but playing.
  playLabel: string;
  // The accessibility label while playing.
  pauseLabel: string;
  disabled: boolean;
  reduceMotion: boolean;
  onPress: () => void;
  testID?: string;
}

export function PlayButton({
  state,
  playLabel,
  pauseLabel,
  disabled,
  reduceMotion,
  onPress,
  testID,
}: PlayButtonProps) {
  const [width] = useState(() => new Animated.Value(layout.playButtonMedium));
  const [scale] = useState(() => new Animated.Value(1));
  const previous = useRef<PlayButtonState>(state);
  const pillWidth = useRef<number | null>(null);

  useLayoutEffect(() => {
    const before = previous.current;
    previous.current = state;
    if (state === "idle") return;
    const measured = pillWidth.current;
    if (before === "idle" && measured !== null && !reduceMotion) {
      width.setValue(measured);
      Animated.timing(width, {
        toValue: layout.playButtonMedium,
        duration: motion.duration.fast,
        useNativeDriver: false,
      }).start();
    } else {
      width.setValue(layout.playButtonMedium);
    }
    if (state === "playing" && before !== "playing" && !reduceMotion) {
      scale.setValue(motion.enterScale);
      Animated.timing(scale, {
        toValue: 1,
        duration: motion.duration.fast,
        useNativeDriver: true,
      }).start();
    } else {
      scale.setValue(1);
    }
  }, [state, reduceMotion, width, scale]);

  const inactive = disabled || state === "loading";
  const tone: Tone = disabled ? "disabled" : "inverse";
  const onLayout = (event: LayoutChangeEvent) => {
    if (state === "idle") pillWidth.current = event.nativeEvent.layout.width;
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={state === "playing" ? pauseLabel : playLabel}
      accessibilityState={{ disabled: inactive, busy: state === "loading" }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
      testID={testID}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Animated.View
          style={[
            styles.shape,
            disabled ? styles.inactive : styles.active,
            state === "idle" ? undefined : { width },
          ]}
          onLayout={onLayout}
          testID="play-button-pill"
        >
          {state === "idle" ? (
            <View style={styles.pill}>
              <Icon name="play" size="lg" tone={tone} />
              <Text variant="button" tone={tone}>
                {playLabel}
              </Text>
            </View>
          ) : state === "loading" ? (
            <ActivityIndicator color={toneColor[tone]} testID="play-button-busy" />
          ) : state === "playing" ? (
            <View testID="play-button-pause">
              <Icon name="pause" size="lg" tone={tone} />
            </View>
          ) : (
            <View testID="play-button-play">
              <Icon name="play" size="lg" tone={tone} />
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shape: {
    height: layout.playButtonMedium,
    borderRadius: radius.full,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  active: { backgroundColor: color.accent.primary },
  inactive: { backgroundColor: color.surface.control },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  pressed: { opacity: motion.pressOpacity },
});

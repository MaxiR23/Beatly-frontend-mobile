// INFO: the detail play button, with four states: idle is an accent pill layout.playButtonPill wide with the play glyph and a label; loading, playing and paused are a circle with a spinner, the pause glyph or the play glyph. Leaving idle the label fades in motion.playButton.labelFade, then the pill, holding the play glyph, shrinks to the circle in motion.playButton.shrink (ease in-out), whatever the state does meanwhile; only then does it draw the spinner, the play glyph or the pause glyph, which scales in from motion.enterScale in motion.playButton.scaleIn. Under reduce motion nothing animates. Disabled greys it out and ignores presses; loading ignores them too.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, View } from "react-native";

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
  const [width] = useState(
    () => new Animated.Value(state === "idle" ? layout.playButtonPill : layout.playButtonMedium),
  );
  const [scale] = useState(() => new Animated.Value(1));
  const [labelOpacity] = useState(() => new Animated.Value(1));
  const [phase, setPhase] = useState<"fade" | "shrink" | null>(null);
  // The fade phase is set while rendering the state change, so the label is still drawn when the fade starts.
  const [drawn, setDrawn] = useState<PlayButtonState>(state);
  if (state !== drawn) {
    setDrawn(state);
    if (drawn === "idle" && !reduceMotion) setPhase("fade");
  }
  const previous = useRef<PlayButtonState>(state);
  const running = useRef<Animated.CompositeAnimation | null>(null);

  useLayoutEffect(() => {
    const scaleIn = () => {
      scale.setValue(motion.enterScale);
      Animated.timing(scale, {
        toValue: 1,
        duration: motion.playButton.scaleIn,
        useNativeDriver: true,
      }).start();
    };
    const before = previous.current;
    previous.current = state;
    if (state === "idle") {
      running.current?.stop();
      labelOpacity.setValue(1);
      width.setValue(layout.playButtonPill);
      scale.setValue(1);
      return;
    }
    if (before === "idle" && !reduceMotion) {
      width.setValue(layout.playButtonPill);
      scale.setValue(1);
      const fade = Animated.timing(labelOpacity, {
        toValue: 0,
        duration: motion.playButton.labelFade,
        useNativeDriver: true,
      });
      running.current = fade;
      fade.start(({ finished }) => {
        if (running.current !== fade) return;
        if (!finished) {
          running.current = null;
          setPhase(null);
          return;
        }
        setPhase("shrink");
        const shrink = Animated.timing(width, {
          toValue: layout.playButtonMedium,
          duration: motion.playButton.shrink,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        });
        running.current = shrink;
        shrink.start(({ finished: done }) => {
          if (running.current === shrink) running.current = null;
          setPhase(null);
          if (done && previous.current === "playing") scaleIn();
        });
      });
      return;
    }
    // A change while the chain runs keeps it going; the content and the scale-in wait for its end.
    if (running.current !== null) return;
    width.setValue(layout.playButtonMedium);
    if (state === "playing" && before !== "playing" && !reduceMotion) scaleIn();
    else scale.setValue(1);
  }, [state, reduceMotion, width, scale, labelOpacity]);

  useEffect(
    () => () => {
      running.current?.stop();
    },
    [],
  );

  const inactive = disabled || state === "loading";
  const tone: Tone = disabled ? "disabled" : "inverse";

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
          style={[styles.shape, disabled ? styles.inactive : styles.active, { width }]}
          testID="play-button-pill"
        >
          {state === "idle" || phase === "fade" ? (
            <View style={styles.pill}>
              <Icon name="play" size="lg" tone={tone} />
              <Animated.View style={{ opacity: labelOpacity }} testID="play-button-label">
                <Text variant="button" tone={tone}>
                  {playLabel}
                </Text>
              </Animated.View>
            </View>
          ) : phase === "shrink" ? (
            <View testID="play-button-shrink">
              <Icon name="play" size="lg" tone={tone} />
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
  },
  pressed: { opacity: motion.pressOpacity },
});

// INFO: the detail play button, with four states: idle is an accent pill layout.playButtonPill wide with the play glyph and a label; loading, playing and paused are a circle with a spinner, the pause glyph or the play glyph. The control keeps a layout.playButtonPill slot and draws the pill from two caps and a bridge that one shrink value, owned by the caller, moves on the native driver (caps toward the center, bridge scaled to nothing), so no width or layout animates; the touch target is the pill while idle and while it shrinks, the circle after. Leaving idle the label fades in motion.playButton.labelFade, then the pill, holding the play glyph, shrinks to the circle in motion.playButton.shrink (ease in-out), whatever the state does meanwhile; only then does it draw the spinner, the play glyph or the pause glyph, which scales in from motion.enterScale in motion.playButton.scaleIn. Under reduce motion nothing animates. Disabled greys it out and ignores presses; loading ignores them too.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, View } from "react-native";

import { color } from "../tokens/color.ts";
import { motion } from "../tokens/motion.ts";
import { radius } from "../tokens/radius.ts";
import { layout, spacing } from "../tokens/spacing.ts";
import { Icon } from "./Icon.tsx";
import { Text } from "./Text.tsx";
import { toneColor, type Tone } from "./tone.ts";
import { pressFeedback } from "./pressFeedback.ts";

export type PlayButtonState = "idle" | "loading" | "playing" | "paused";

interface PlayButtonProps {
  state: PlayButtonState;
  // The idle pill's text, and the accessibility label in every state but playing.
  playLabel: string;
  // The accessibility label while playing.
  pauseLabel: string;
  disabled: boolean;
  reduceMotion: boolean;
  // 0 the idle pill, 1 the circle; owned by the caller so the side buttons can follow it.
  shrink: Animated.Value;
  onPress: () => void;
  testID?: string;
}

// How far each end of the pill travels to become the circle.
const travel = (layout.playButtonPill - layout.playButtonMedium) / 2;

// The offset of something at the pill's start or end while it shrinks: toward the center by travel.
export function shrinkOffset(shrink: Animated.Value, side: "leading" | "trailing") {
  return shrink.interpolate({
    inputRange: [0, 1],
    outputRange: [0, side === "leading" ? travel : -travel],
  });
}

export function PlayButton({
  state,
  playLabel,
  pauseLabel,
  disabled,
  reduceMotion,
  shrink,
  onPress,
  testID,
}: PlayButtonProps) {
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
      shrink.setValue(0);
      scale.setValue(1);
      return;
    }
    if (before === "idle" && !reduceMotion) {
      shrink.setValue(0);
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
        const shrinkTiming = Animated.timing(shrink, {
          toValue: 1,
          duration: motion.playButton.shrink,
          easing: Easing.inOut((t) => Easing.ease(t)),
          useNativeDriver: true,
        });
        running.current = shrinkTiming;
        shrinkTiming.start(({ finished: done }) => {
          if (running.current === shrinkTiming) running.current = null;
          setPhase(null);
          if (done && previous.current === "playing") scaleIn();
        });
      });
      return;
    }
    // A change while the chain runs keeps it going; the content and the scale-in wait for its end.
    if (running.current !== null) return;
    shrink.setValue(1);
    if (state === "playing" && before !== "playing" && !reduceMotion) scaleIn();
    else scale.setValue(1);
  }, [state, reduceMotion, shrink, scale, labelOpacity]);

  useEffect(
    () => () => {
      running.current?.stop();
    },
    [],
  );

  const inactive = disabled || state === "loading";
  const wide = state === "idle" || phase !== null;
  const fill = disabled ? styles.inactive : styles.active;
  const tone: Tone = disabled ? "disabled" : "inverse";

  const press = pressFeedback({ on: "accent", shape: "round" });
  return (
    <View style={styles.slot} pointerEvents="box-none">
      <Pressable
        android_ripple={press.android_ripple}
        accessibilityRole="button"
        accessibilityLabel={state === "playing" ? pauseLabel : playLabel}
        accessibilityState={{ disabled: inactive, busy: state === "loading" }}
        disabled={inactive}
        onPress={onPress}
        style={({ pressed }) => press.style(pressed)}
        testID={testID}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <View
            style={[styles.box, wide ? styles.boxWide : styles.boxCircle]}
            testID="play-button-pill"
          >
            <View style={[styles.frame, !wide && styles.frameCircle]} pointerEvents="none">
              <Animated.View
                style={[
                  styles.cap,
                  styles.capStart,
                  fill,
                  { transform: [{ translateX: shrinkOffset(shrink, "leading") }] },
                ]}
                testID="play-button-cap-start"
              />
              <Animated.View
                style={[
                  styles.bridge,
                  fill,
                  {
                    transform: [
                      { scaleX: shrink.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) },
                    ],
                  },
                ]}
                testID="play-button-bridge"
              />
              <Animated.View
                style={[
                  styles.cap,
                  styles.capEnd,
                  fill,
                  { transform: [{ translateX: shrinkOffset(shrink, "trailing") }] },
                ]}
                testID="play-button-cap-end"
              />
            </View>
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
          </View>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    width: layout.playButtonPill,
    height: layout.playButtonMedium,
    alignItems: "center",
    justifyContent: "center",
  },
  box: {
    height: layout.playButtonMedium,
    alignItems: "center",
    justifyContent: "center",
  },
  boxWide: { width: layout.playButtonPill },
  boxCircle: { width: layout.playButtonMedium },
  frame: {
    position: "absolute",
    top: 0,
    left: 0,
    width: layout.playButtonPill,
    height: layout.playButtonMedium,
  },
  frameCircle: { left: -travel },
  cap: {
    position: "absolute",
    top: 0,
    width: layout.playButtonMedium,
    height: layout.playButtonMedium,
    borderRadius: radius.full,
  },
  capStart: { left: 0 },
  capEnd: { right: 0 },
  bridge: {
    position: "absolute",
    top: 0,
    left: layout.playButtonMedium / 2,
    width: 2 * travel,
    height: layout.playButtonMedium,
  },
  active: { backgroundColor: color.accent.primary },
  inactive: { backgroundColor: color.surface.control },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
});

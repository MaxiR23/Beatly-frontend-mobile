// INFO: the one press feedback of ui (ADR 027): on Android a Material 3 ripple over the content, clipped to the pressable's shape, and no opacity; on iOS the pressed control fades to motion.pressOpacity.
import { StyleSheet, type PressableAndroidRippleConfig, type ViewStyle } from "react-native";

import { color } from "../tokens/color.ts";
import { motion } from "../tokens/motion.ts";
import { radius } from "../tokens/radius.ts";
import { isAndroidVariant } from "./platform.ts";

interface PressFeedbackOptions {
  // The fill under the content: a light one (the white accent, the Android snackbar's inverse surface), or anything else.
  on?: "surface" | "accent";
  // "bounds" clips the ripple to the pressable's own corners (a rectangle without them); "round" rounds it fully: a circle on a square, a pill otherwise.
  shape?: "bounds" | "round";
}

export interface PressFeedback {
  android_ripple: PressableAndroidRippleConfig | undefined;
  style: (pressed: boolean) => ViewStyle | null;
}

// Called in the component's body, never at module level: the platform is read on every call.
export function pressFeedback({
  on = "surface",
  shape = "bounds",
}: PressFeedbackOptions = {}): PressFeedback {
  if (!isAndroidVariant()) {
    return { android_ripple: undefined, style: (pressed) => (pressed ? styles.faded : null) };
  }
  const clip = shape === "round" ? styles.clipRound : styles.clip;
  return {
    // foreground: drawn over the children, so the overflow clip rounds it (a background ripple is drawn before the clip).
    android_ripple: {
      color: on === "accent" ? color.overlay.rippleOnAccent : color.overlay.ripple,
      foreground: true,
    },
    style: () => clip,
  };
}

const styles = StyleSheet.create({
  faded: { opacity: motion.pressOpacity },
  clip: { overflow: "hidden" },
  clipRound: { overflow: "hidden", borderRadius: radius.full },
});

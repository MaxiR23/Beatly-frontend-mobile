// INFO: inline pressable text, nested inside a Text; the caller passes the label translated.
import { Text as NativeText } from "react-native";

import { maxFontScale, typography } from "../tokens/typography.ts";
import { toneColor } from "./tone.ts";

interface LinkProps {
  label: string;
  onPress: () => void;
}

export function Link({ label, onPress }: LinkProps) {
  return (
    <NativeText
      accessibilityRole="link"
      onPress={onPress}
      maxFontSizeMultiplier={maxFontScale}
      style={[typography.link, { color: toneColor.primary }]}
    >
      {label}
    </NativeText>
  );
}

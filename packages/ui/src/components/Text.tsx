// INFO: text with one variant per typography role, colored from the text
// tokens and capped by maxFontScale. It takes no style prop on purpose.
import type { ReactNode } from "react";
import { Text as NativeText } from "react-native";

import { maxFontScale, typography } from "../tokens/typography.ts";
import { toneColor, type Tone } from "./tone.ts";

interface TextProps {
  variant?: keyof typeof typography;
  tone?: Tone;
  align?: "left" | "center";
  numberOfLines?: number;
  children: ReactNode;
}

export function Text({
  variant = "body",
  tone = "primary",
  align = "left",
  numberOfLines,
  children,
}: TextProps) {
  return (
    <NativeText
      style={[typography[variant], { color: toneColor[tone], textAlign: align }]}
      maxFontSizeMultiplier={maxFontScale}
      numberOfLines={numberOfLines}
    >
      {children}
    </NativeText>
  );
}

// INFO: the single place where a text or icon color is chosen. Components
// take a tone, never a raw color, so a screen cannot pass a literal.
import { color } from "../tokens/color.ts";

export const toneColor = {
  primary: color.text.primary,
  secondary: color.text.secondary,
  tertiary: color.text.tertiary,
  disabled: color.text.disabled,
  inverse: color.text.inverse,
  error: color.status.error,
  success: color.status.success,
} as const;

export type Tone = keyof typeof toneColor;

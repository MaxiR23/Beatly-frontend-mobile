// INFO: the navigation theme every navigator paints with, from tokens; its background is what a stack and the native tabs draw behind a screen during a transition.
import { color } from "@beatly/ui";
import { DarkTheme, type Theme } from "expo-router";

export const navigationTheme: Theme = {
  ...DarkTheme,
  dark: true,
  colors: {
    primary: color.accent.primary,
    background: color.surface.base,
    card: color.surface.base,
    text: color.text.primary,
    border: color.surface.border,
    notification: color.status.error,
  },
};

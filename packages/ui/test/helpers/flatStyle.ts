// packages/ui/test/helpers/flatStyle.ts
//
// Test helper: flattens a style prop to one object. React Native 0.88 types
// StyleSheet.flatten as nullable; a missing style is an empty object here.
//
// Tested:
// - Not a test itself; used by the component and screen tests
//
// What is covered:
// - An array or nested style flattened to one object; no style gives {}
//
// Run with: pnpm --filter @beatly/ui test
//
// SEE: Libraries/StyleSheet/flattenStyle in react-native

import { StyleSheet, type StyleProp, type TextStyle } from "react-native";

// TextStyle extends ViewStyle, so the result reads both kinds of style.
// The argument is a style read off a rendered node, whose props are untyped.
export function flatStyle(style: unknown): TextStyle {
  return StyleSheet.flatten(style as StyleProp<TextStyle>) ?? {};
}

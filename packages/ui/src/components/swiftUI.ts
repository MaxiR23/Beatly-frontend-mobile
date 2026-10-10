// INFO: the only importer of @expo/ui (ADR 025): whether SwiftUI views can be drawn (iOS with the ExpoUI native module built in) and, only then, the lazy load of its views and modifiers; NativeMenu and NativeEditList draw through it.
import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";
import type * as Views from "@expo/ui/swift-ui";
import type * as Modifiers from "@expo/ui/swift-ui/modifiers";

export type SwiftUIViews = typeof Views;
export type SwiftUIModifiers = typeof Modifiers;

// The library evaluates its native module on import, which crashes where the module is not built in (Expo Go), so it is checked before use.
export function isSwiftUIAvailable(): boolean {
  return Platform.OS === "ios" && requireOptionalNativeModule("ExpoUI") !== null;
}

export function loadSwiftUI(): { views: SwiftUIViews; modifiers: SwiftUIModifiers } {
  // A lazy require, not an import: the module must not load where it is missing.
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded only once the native module is known to exist
  const views = require("@expo/ui/swift-ui") as SwiftUIViews;
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded with the library above
  const modifiers = require("@expo/ui/swift-ui/modifiers") as SwiftUIModifiers;
  return { views, modifiers };
}

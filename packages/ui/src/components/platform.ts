// INFO: the single test for the Android variants of ADR 027: true on Android, where a component draws its Material 3 branch; iOS (26+ and older) keeps its own.
import { Platform } from "react-native";

// Read on every call, never cached: tests switch Platform.OS at runtime.
export function isAndroidVariant(): boolean {
  return Platform.OS === "android";
}

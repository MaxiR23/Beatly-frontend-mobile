// INFO: a blur of whatever is drawn under it, filling its parent. The parent supplies the size. The
// only importer of expo-blur. Never put it under a view with an opacity below 1: the system blur
// renders wrong there; fade it with a mask (AlphaMask) instead.
import { BlurView } from "expo-blur";
import { StyleSheet } from "react-native";

// The tints the blur tokens use; a subset of the library's own.
export type BlurFillTint = "dark" | "default" | "light";

interface BlurFillProps {
  intensity: number;
  tint: BlurFillTint;
  testID?: string;
}

export function BlurFill({ intensity, tint, testID }: BlurFillProps) {
  return (
    <BlurView intensity={intensity} tint={tint} style={StyleSheet.absoluteFill} testID={testID} />
  );
}

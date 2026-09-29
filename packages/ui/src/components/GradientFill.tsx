// INFO: a linear gradient that fills its parent. The parent supplies the
// size and overflow: "hidden". The only importer of react-native-svg.
import { useId } from "react";
import { StyleSheet } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

interface GradientFillProps {
  colors: readonly [string, string] | readonly [string, string, string];
  direction: "diagonal" | "vertical";
}

export function GradientFill({ colors, direction }: GradientFillProps) {
  const id = useId();
  const x2 = direction === "diagonal" ? "1" : "0";

  return (
    <Svg style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2={x2} y2="1">
          {colors.map((color, index) => (
            <Stop key={index} offset={index / (colors.length - 1)} stopColor={color} />
          ))}
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

// INFO: a linear gradient that fills its parent. The parent supplies the
// size and overflow: "hidden". The only importer of react-native-svg.
// The svg library drops the alpha of a stop color, so each stop also gets a
// stopOpacity read from the color's own alpha (a transparent stop fades).
import { useId } from "react";
import { processColor, StyleSheet } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

interface GradientFillProps {
  colors: readonly [string, string] | readonly [string, string, string];
  direction: "diagonal" | "vertical";
}

function alphaOf(color: string): number {
  const packed = processColor(color);
  return typeof packed === "number" ? ((packed >>> 24) & 0xff) / 255 : 1;
}

export function GradientFill({ colors, direction }: GradientFillProps) {
  const id = useId();
  const x2 = direction === "diagonal" ? "1" : "0";

  return (
    <Svg style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2={x2} y2="1">
          {colors.map((color, index) => (
            <Stop
              key={index}
              offset={index / (colors.length - 1)}
              stopColor={color}
              stopOpacity={alphaOf(color)}
            />
          ))}
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

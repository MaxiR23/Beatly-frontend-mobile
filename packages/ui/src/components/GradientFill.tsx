// INFO: a linear gradient that fills its parent. The parent supplies the
// size and overflow: "hidden". The only importer of react-native-svg.
// The svg library drops the alpha of a stop color, so each stop also gets a
// stopOpacity read from the color's own alpha (a transparent stop fades).
// With color and stops it draws one color at the given offsets and opacities (the stop opacity times the color's own alpha).
import { useId } from "react";
import { processColor, StyleSheet } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

interface GradientStop {
  offset: number;
  opacity: number;
}

type GradientFillProps = { direction: "diagonal" | "vertical" } & (
  | { colors: readonly [string, string] | readonly [string, string, string] }
  | { color: string; stops: readonly GradientStop[] }
);

function alphaOf(color: string): number {
  const packed = processColor(color);
  return typeof packed === "number" ? ((packed >>> 24) & 0xff) / 255 : 1;
}

export function GradientFill(props: GradientFillProps) {
  const { direction } = props;
  const id = useId();
  const x2 = direction === "diagonal" ? "1" : "0";

  return (
    <Svg style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2={x2} y2="1">
          {"colors" in props
            ? props.colors.map((color, index) => (
                <Stop
                  key={index}
                  offset={index / (props.colors.length - 1)}
                  stopColor={color}
                  stopOpacity={alphaOf(color)}
                />
              ))
            : props.stops.map((stop, index) => (
                <Stop
                  key={index}
                  offset={stop.offset}
                  stopColor={props.color}
                  stopOpacity={stop.opacity * alphaOf(props.color)}
                />
              ))}
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

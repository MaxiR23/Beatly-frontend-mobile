// INFO: border geometry tokens. Color comes from color.surface.border;
// this is only the width scale (the resting width and the focused outline
// of the Android text field). `border.hairline` (StyleSheet.hairlineWidth)
// lives in ./native.ts, not here: apps/mobile/app.config.ts evaluates the
// @beatly/ui main barrel (this file included) under Node, which cannot
// parse react-native's source, so nothing reachable from src/index.ts may
// import it. See DESIGN.md and ARCHITECTURE.md.
export const border = {
  width: 1,
  // The focused outline of the Android text field (Material 3 focused outline).
  widthFocused: 2,
} as const;

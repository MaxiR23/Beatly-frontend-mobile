// INFO: border geometry tokens. Color comes from color.surface.border;
// this is only the width scale. `border.hairline` (StyleSheet.hairlineWidth)
// lives in ./native.ts, not here: apps/mobile/app.config.ts evaluates the
// @beatly/ui main barrel (this file included) under Node, which cannot
// parse react-native's source, so nothing reachable from src/index.ts may
// import it. See DESIGN.md and ARCHITECTURE.md.
export const border = {
  width: 1,
} as const;

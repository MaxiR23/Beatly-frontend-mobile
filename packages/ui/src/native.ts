// INFO: native-only entry of @beatly/ui, separate from ./index.ts because
// apps/mobile/app.config.ts evaluates the main barrel under Node, which
// cannot parse react-native's source. Anything that needs react-native
// (like StyleSheet.hairlineWidth) is exported from here instead, imported
// as `@beatly/ui/native`. See ARCHITECTURE.md and DESIGN.md.
import { StyleSheet } from "react-native";

import { border as baseBorder } from "./tokens/border.ts";

export const border = {
  ...baseBorder,
  hairline: StyleSheet.hairlineWidth,
} as const;

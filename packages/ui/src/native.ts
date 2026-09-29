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

export { Text } from "./components/Text.tsx";
export { Button } from "./components/Button.tsx";
export { Card } from "./components/Card.tsx";
export { Link } from "./components/Link.tsx";
export { Input } from "./components/Input.tsx";
export { Icon, type IconName } from "./components/Icon.tsx";
export { LoadingState } from "./components/LoadingState.tsx";
export { EmptyState } from "./components/EmptyState.tsx";
export { ErrorState } from "./components/ErrorState.tsx";
export type { Tone } from "./components/tone.ts";
export { GlassSurface, isGlassAvailable } from "./components/GlassSurface.tsx";
export { FloatingTabBar, floatingTabBarClearance } from "./components/FloatingTabBar.tsx";
export { Sheet } from "./components/Sheet.tsx";
export { Avatar } from "./components/Avatar.tsx";
export { Carousel, type CarouselItem } from "./components/Carousel.tsx";
export { GenreRow } from "./components/GenreRow.tsx";
export { Chip } from "./components/Chip.tsx";
export { IconButton } from "./components/IconButton.tsx";
export { MediaGrid, gridCardSize } from "./components/MediaGrid.tsx";

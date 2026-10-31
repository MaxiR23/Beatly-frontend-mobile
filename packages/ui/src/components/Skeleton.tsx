// INFO: the static skeleton primitives: a bar the height of a text role's line and a share of its row wide, a circle the side of an avatar and a square card block, in the skeleton base color. They draw no motion.
import { StyleSheet, View } from "react-native";

import { color } from "../tokens/color.ts";
import { radius } from "../tokens/radius.ts";
import { layout } from "../tokens/spacing.ts";
import { typography } from "../tokens/typography.ts";

type BarText = "title" | "body" | "label" | "section" | "rowTitle" | "meta";

export function SkeletonBar({
  text,
  width,
}: {
  text: BarText;
  width: keyof typeof layout.skeletonBar;
}) {
  return (
    <View
      accessible={false}
      style={[
        styles.bar,
        { height: typography[text].lineHeight, width: layout.skeletonBar[width] },
      ]}
    />
  );
}

export function SkeletonCircle({ size }: { size: "header" | "profile" }) {
  const side = size === "profile" ? layout.profileAvatar : layout.avatar;
  return <View accessible={false} style={[styles.circle, { width: side, height: side }]} />;
}

export function SkeletonCard() {
  return <View accessible={false} style={styles.card} />;
}

const styles = StyleSheet.create({
  bar: { borderRadius: radius.sm, backgroundColor: color.surface.border },
  card: {
    width: layout.carouselCard,
    height: layout.carouselCard,
    borderRadius: radius.sm,
    backgroundColor: color.surface.border,
  },
  circle: { borderRadius: radius.full, backgroundColor: color.surface.border },
});

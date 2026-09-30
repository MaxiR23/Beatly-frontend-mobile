// INFO: the static loading skeleton of a detail screen: a cover block, a
// title bar, a meta bar and six track rows, in the skeleton base color. The
// image variant swaps the centered cover for a full-width hero block with the
// title bar at its bottom left. It draws no motion.
import { StyleSheet, View } from "react-native";

import { color } from "../tokens/color.ts";
import { radius } from "../tokens/radius.ts";
import { layout, spacing } from "../tokens/spacing.ts";
import { typography } from "../tokens/typography.ts";

const ROWS = [0, 1, 2, 3, 4, 5] as const;

interface DetailSkeletonProps {
  label: string;
  topInset: number;
  hero?: "cover" | "image" | undefined;
}

export function DetailSkeleton({ label, topInset, hero }: DetailSkeletonProps) {
  if (hero === "image") {
    return (
      <View
        style={styles.imageRoot}
        accessibilityRole="progressbar"
        accessibilityLabel={label}
        testID="detail-skeleton"
      >
        <View style={styles.imageHero} testID="detail-skeleton-image">
          <View style={styles.titleBar} />
        </View>
        <View style={styles.imageBody}>
          <View style={styles.metaBar} />
          {ROWS.map((row) => (
            <SkeletonRow key={row} />
          ))}
        </View>
      </View>
    );
  }
  return (
    <View
      style={[styles.root, { paddingTop: topInset + layout.controlHeight + spacing.sm }]}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      testID="detail-skeleton"
    >
      <View style={styles.cover} />
      <View style={styles.titleBar} />
      <View style={styles.metaBar} />
      {ROWS.map((row) => (
        <SkeletonRow key={row} />
      ))}
    </View>
  );
}

function SkeletonRow() {
  return (
    <View style={styles.row}>
      <View style={styles.number} />
      <View style={styles.rowText}>
        <View style={styles.rowTitle} />
        <View style={styles.rowMeta} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  imageRoot: { flex: 1 },
  imageHero: {
    alignSelf: "stretch",
    aspectRatio: layout.heroImageRatio,
    justifyContent: "flex-end",
    paddingHorizontal: layout.gutter,
    paddingBottom: spacing.lg,
    backgroundColor: color.surface.card,
  },
  imageBody: { gap: spacing.md, paddingHorizontal: layout.gutter, paddingTop: spacing.lg },
  root: { flex: 1, gap: spacing.md, paddingHorizontal: layout.gutter },
  cover: {
    alignSelf: "center",
    width: layout.heroCover,
    height: layout.heroCover,
    borderRadius: radius.sm,
    backgroundColor: color.surface.border,
  },
  titleBar: {
    height: typography.display.lineHeight,
    width: layout.skeletonBar.title,
    borderRadius: radius.sm,
    backgroundColor: color.surface.border,
  },
  metaBar: {
    height: typography.meta.lineHeight,
    width: layout.skeletonBar.meta,
    borderRadius: radius.sm,
    backgroundColor: color.surface.border,
  },
  row: { flexDirection: "row", alignItems: "center", gap: layout.gap },
  number: {
    width: layout.trackNumber,
    height: typography.meta.lineHeight,
    borderRadius: radius.sm,
    backgroundColor: color.surface.border,
  },
  rowText: { flex: 1, gap: spacing.xxs },
  rowTitle: {
    height: typography.rowTitle.lineHeight,
    width: layout.skeletonBar.rowTitle,
    borderRadius: radius.sm,
    backgroundColor: color.surface.border,
  },
  rowMeta: {
    height: typography.meta.lineHeight,
    width: layout.skeletonBar.rowMeta,
    borderRadius: radius.sm,
    backgroundColor: color.surface.border,
  },
});

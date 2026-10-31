// INFO: the static loading skeleton of a carousel section: a title bar and a row of placeholder cards, in the skeleton base color. It draws no motion; with a label it is a progress bar, without it it is hidden from screen readers.
import { StyleSheet, View } from "react-native";

import { layout, spacing } from "../tokens/spacing.ts";
import { SkeletonBar, SkeletonCard } from "./Skeleton.tsx";

const cards = Array.from({ length: layout.skeletonCards }, (_, index) => index);

export function CarouselSkeleton({
  label,
  testID = "carousel-skeleton",
}: {
  label?: string | undefined;
  testID?: string;
}) {
  return (
    <View
      accessible={label !== undefined}
      accessibilityRole={label !== undefined ? "progressbar" : undefined}
      accessibilityLabel={label}
      testID={testID}
      style={styles.section}
    >
      <View style={styles.header}>
        <SkeletonBar text="section" width="title" />
      </View>
      <View style={styles.row}>
        {cards.map((index) => (
          <View key={index} style={styles.card}>
            <SkeletonCard />
            <SkeletonBar text="rowTitle" width="rowTitle" />
            <SkeletonBar text="meta" width="meta" />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  header: { paddingHorizontal: layout.gutter },
  row: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: layout.gutter,
    overflow: "hidden",
  },
  card: { width: layout.carouselCard, gap: spacing.xs },
});

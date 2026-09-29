// INFO: a two-column grid of media cards that starts at the gutter; the
// card side comes from the window width.
import { FlatList, StyleSheet, useWindowDimensions } from "react-native";

import { layout, spacing } from "../tokens/spacing.ts";
import type { CarouselItem } from "./Carousel.tsx";
import { MediaCard } from "./MediaCard.tsx";

const COLUMNS = 2;

export function gridCardSize(windowWidth: number): number {
  return Math.floor((windowWidth - 2 * layout.gutter - spacing.md) / COLUMNS);
}

interface MediaGridProps {
  items: readonly CarouselItem[];
  bottomPadding: number;
  testID?: string;
}

export function MediaGrid({ items, bottomPadding, testID }: MediaGridProps) {
  const { width } = useWindowDimensions();
  const size = gridCardSize(width);

  return (
    <FlatList
      testID={testID}
      data={items}
      numColumns={COLUMNS}
      keyExtractor={(item) => item.key}
      columnWrapperStyle={styles.column}
      contentContainerStyle={[styles.list, { paddingBottom: bottomPadding }]}
      renderItem={({ item }) => (
        <MediaCard
          title={item.title}
          subtitle={item.subtitle}
          urls={item.urls}
          shape={item.shape}
          size={size}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  column: { gap: spacing.md },
  list: { paddingHorizontal: layout.gutter, gap: spacing.lg },
});

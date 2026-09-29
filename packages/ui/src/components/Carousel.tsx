// INFO: a section: its title, then a horizontal list of media cards that
// starts at the gutter and reports when the end is reached.
import { FlatList, StyleSheet, View } from "react-native";

import { layout, spacing } from "../tokens/spacing.ts";
import { MediaCard } from "./MediaCard.tsx";
import { Text } from "./Text.tsx";

export interface CarouselItem {
  key: string;
  title?: string | undefined;
  subtitle?: string | undefined;
  urls: readonly string[];
  shape: "square" | "round";
  onPress?: (() => void) | undefined;
}

interface CarouselProps {
  title: string;
  items: readonly CarouselItem[];
  onEndReached?: () => void;
  testID?: string;
}

export function Carousel({ title, items, onEndReached, testID }: CarouselProps) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text variant="section">{title}</Text>
      </View>
      <FlatList
        testID={testID}
        horizontal
        data={items}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        onEndReached={onEndReached}
        renderItem={({ item }) => (
          <MediaCard
            title={item.title}
            subtitle={item.subtitle}
            urls={item.urls}
            shape={item.shape}
            onPress={item.onPress}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  header: { paddingHorizontal: layout.gutter },
  list: { paddingHorizontal: layout.gutter, gap: spacing.md },
});

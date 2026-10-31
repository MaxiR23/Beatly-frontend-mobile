// INFO: a section: its title (optionally with a round photo and an overline above it), then a horizontal list of media cards that
// starts at the gutter and reports when the end is reached.
import { FlatList, StyleSheet, View } from "react-native";

import { layout, spacing } from "../tokens/spacing.ts";
import { Cover } from "./Cover.tsx";
import type { ImageTiers } from "./imageTier.ts";
import { MediaCard } from "./MediaCard.tsx";
import { Text } from "./Text.tsx";

export interface CarouselItem {
  key: string;
  title?: string | undefined;
  subtitle?: string | undefined;
  images: readonly ImageTiers[];
  shape: "square" | "round";
  align?: "left" | "center" | undefined;
  onPress?: (() => void) | undefined;
}

interface CarouselProps {
  title: string;
  items: readonly CarouselItem[];
  lead?: { images: readonly ImageTiers[]; overline: string };
  onEndReached?: () => void;
  testID?: string;
}

export function Carousel({ title, items, lead, onEndReached, testID }: CarouselProps) {
  return (
    <View style={styles.section}>
      {lead === undefined ? (
        <View style={styles.header}>
          <Text variant="section">{title}</Text>
        </View>
      ) : (
        <View
          style={[styles.header, styles.lead]}
          testID={testID !== undefined ? `${testID}-lead` : undefined}
        >
          <Cover images={lead.images} shape="round" size={layout.seedAvatar} />
          <View style={styles.leadText}>
            <Text variant="meta" tone="secondary" numberOfLines={1}>
              {lead.overline}
            </Text>
            <Text variant="section" numberOfLines={1}>
              {title}
            </Text>
          </View>
        </View>
      )}
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
            images={item.images}
            shape={item.shape}
            align={item.align}
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
  lead: { flexDirection: "row", alignItems: "center", gap: layout.gap },
  leadText: { flex: 1 },
  list: { paddingHorizontal: layout.gutter, gap: spacing.md },
});

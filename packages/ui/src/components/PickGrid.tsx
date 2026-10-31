// INFO: the onboarding's artist grid: rows of three round-cover tiles with the name centered under each, a ring in color.accent.primary (border.widthFocused) and a check badge on a selected tile that pops from motion.enterScale with the spring, a row that fades in over motion.duration.slow on the native driver (the related artists), a header, an empty element and paging at the end; the tile side comes from the window width; everything at rest under reduce motion.
import { useEffect, useRef, useState, type ReactElement } from "react";
import { Animated, FlatList, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";

import { border } from "../tokens/border.ts";
import { color } from "../tokens/color.ts";
import { icon } from "../tokens/icon.ts";
import { motion } from "../tokens/motion.ts";
import { radius } from "../tokens/radius.ts";
import { layout, spacing } from "../tokens/spacing.ts";
import { Cover } from "./Cover.tsx";
import { Icon } from "./Icon.tsx";
import type { ImageTiers } from "./imageTier.ts";
import { pressFeedback } from "./pressFeedback.ts";
import { Text } from "./Text.tsx";

const COLUMNS = 3;

export function pickTileSize(windowWidth: number): number {
  return Math.floor((windowWidth - 2 * layout.gutter - (COLUMNS - 1) * spacing.md) / COLUMNS);
}

export interface PickTileItem {
  key: string;
  name: string;
  image: ImageTiers | null;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}

export interface PickRow {
  key: string;
  fadeIn: boolean;
  tiles: readonly PickTileItem[];
}

interface PickGridProps {
  rows: readonly PickRow[];
  header: ReactElement;
  empty: ReactElement;
  bottomPadding: number;
  onEndReached: () => void;
  reduceMotion: boolean;
  testID?: string;
}

interface PickTileProps {
  tile: PickTileItem;
  side: number;
  reduceMotion: boolean;
}

function PickTile({ tile, side, reduceMotion }: PickTileProps) {
  const press = pressFeedback({ shape: "round" });
  const [pop] = useState(() => new Animated.Value(1));
  const wasSelected = useRef(tile.selected);
  useEffect(() => {
    const was = wasSelected.current;
    wasSelected.current = tile.selected;
    if (!tile.selected || was || reduceMotion) return;
    pop.setValue(motion.enterScale);
    const run = Animated.spring(pop, {
      toValue: 1,
      damping: motion.spring.damping,
      stiffness: motion.spring.stiffness,
      useNativeDriver: true,
    });
    run.start();
    return () => {
      run.stop();
    };
  }, [tile.selected, reduceMotion, pop]);
  return (
    <Pressable
      android_ripple={press.android_ripple}
      accessibilityRole="button"
      accessibilityLabel={tile.name}
      accessibilityState={{ selected: tile.selected, disabled: tile.disabled && !tile.selected }}
      disabled={tile.disabled && !tile.selected}
      onPress={tile.onPress}
      style={({ pressed }) => [{ width: side }, press.style(pressed)]}
    >
      <Animated.View
        testID="pick-box"
        style={{ width: side, height: side, transform: [{ scale: pop }] }}
      >
        <Cover images={tile.image ? [tile.image] : []} shape="round" size={side} />
        {tile.selected ? <View style={styles.ring} testID="pick-ring" /> : null}
        {tile.selected ? (
          <View style={styles.badge} testID="pick-badge">
            <Icon name="check" size="sm" tone="inverse" />
          </View>
        ) : null}
      </Animated.View>
      <View style={styles.name}>
        <Text variant="rowTitle" align="center" numberOfLines={2}>
          {tile.name}
        </Text>
      </View>
    </Pressable>
  );
}

function FadingRow({
  fadeIn,
  reduceMotion,
  children,
}: {
  fadeIn: boolean;
  reduceMotion: boolean;
  children: ReactElement;
}) {
  const fades = fadeIn && !reduceMotion;
  const [opacity] = useState(() => new Animated.Value(fades ? 0 : 1));
  useEffect(() => {
    if (!fades) {
      opacity.setValue(1);
      return;
    }
    const run = Animated.timing(opacity, {
      toValue: 1,
      duration: motion.duration.slow,
      useNativeDriver: true,
    });
    run.start();
    return () => {
      run.stop();
    };
  }, [fades, opacity]);
  return (
    <Animated.View testID={fadeIn ? "pick-row-fade" : undefined} style={{ opacity }}>
      {children}
    </Animated.View>
  );
}

export function PickGrid({
  rows,
  header,
  empty,
  bottomPadding,
  onEndReached,
  reduceMotion,
  testID,
}: PickGridProps) {
  const { width } = useWindowDimensions();
  const side = pickTileSize(width);
  return (
    <FlatList
      testID={testID}
      data={rows}
      keyExtractor={(row) => row.key}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      onEndReached={onEndReached}
      contentContainerStyle={[styles.list, { paddingBottom: bottomPadding }]}
      renderItem={({ item }) => (
        <FadingRow fadeIn={item.fadeIn} reduceMotion={reduceMotion}>
          <View style={styles.row} testID="pick-row">
            {item.tiles.map((tile) => (
              <PickTile key={tile.key} tile={tile} side={side} reduceMotion={reduceMotion} />
            ))}
          </View>
        </FadingRow>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: layout.gutter, gap: spacing.lg },
  row: { flexDirection: "row", gap: spacing.md },
  name: { paddingTop: spacing.xs },
  ring: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: border.widthFocused,
    borderColor: color.accent.primary,
    borderRadius: radius.full,
  },
  badge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: icon.size.lg,
    height: icon.size.lg,
    borderRadius: radius.full,
    backgroundColor: color.accent.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});

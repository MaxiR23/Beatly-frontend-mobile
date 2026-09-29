// INFO: a cover: a 2 x 2 mosaic with four urls, the first url with one to
// three, a placeholder with none. Images are decorative.
import { Image, StyleSheet, View } from "react-native";

import { color } from "../tokens/color.ts";
import { radius } from "../tokens/radius.ts";
import { layout } from "../tokens/spacing.ts";
import { Icon } from "./Icon.tsx";

const MOSAIC_SIZE = 4;
const MOSAIC_CELL = layout.carouselCard / 2;

interface CoverProps {
  urls: readonly string[];
  shape: "square" | "round";
}

export function Cover({ urls, shape }: CoverProps) {
  const first = urls[0];

  return (
    <View style={[styles.box, shape === "round" ? styles.round : styles.square]}>
      {urls.length >= MOSAIC_SIZE ? (
        <View style={styles.mosaic} testID="cover-mosaic">
          {urls.slice(0, MOSAIC_SIZE).map((url, index) => (
            <Image
              key={`${String(index)}:${url}`}
              source={{ uri: url }}
              style={styles.cell}
              accessible={false}
            />
          ))}
        </View>
      ) : first !== undefined ? (
        <Image
          source={{ uri: first }}
          style={styles.fill}
          accessible={false}
          testID="cover-single"
        />
      ) : (
        <View style={styles.placeholder} testID="cover-placeholder">
          <Icon name="music" size="xl" tone="tertiary" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: layout.carouselCard,
    height: layout.carouselCard,
    overflow: "hidden",
    backgroundColor: color.surface.card,
  },
  square: { borderRadius: radius.sm },
  round: { borderRadius: radius.full },
  mosaic: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: MOSAIC_CELL, height: MOSAIC_CELL },
  fill: { width: layout.carouselCard, height: layout.carouselCard },
  placeholder: { flex: 1, alignItems: "center", justifyContent: "center" },
});

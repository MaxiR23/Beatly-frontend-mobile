// INFO: a cover: a 2 x 2 mosaic with four urls, the first url with one to
// three, a placeholder with none; with an icon, an accent tile with the
// glyph instead of images. Images are decorative.
import { Image, StyleSheet, View } from "react-native";

import { color } from "../tokens/color.ts";
import { radius } from "../tokens/radius.ts";
import { layout } from "../tokens/spacing.ts";
import { Icon, type IconName } from "./Icon.tsx";

const MOSAIC_SIZE = 4;

interface CoverProps {
  urls: readonly string[];
  shape: "square" | "round";
  size?: number;
  icon?: IconName | undefined;
}

export function Cover({ urls, shape, size = layout.carouselCard, icon }: CoverProps) {
  const first = urls[0];
  const cell = { width: size / 2, height: size / 2 };
  const box = { width: size, height: size };

  return (
    <View style={[styles.box, box, shape === "round" ? styles.round : styles.square]}>
      {icon !== undefined ? (
        <View style={styles.tile} testID="cover-tile">
          <Icon name={icon} size="lg" tone="inverse" />
        </View>
      ) : urls.length >= MOSAIC_SIZE ? (
        <View style={styles.mosaic} testID="cover-mosaic">
          {urls.slice(0, MOSAIC_SIZE).map((url, index) => (
            <Image
              key={`${String(index)}:${url}`}
              source={{ uri: url }}
              style={cell}
              accessible={false}
            />
          ))}
        </View>
      ) : first !== undefined ? (
        <Image source={{ uri: first }} style={box} accessible={false} testID="cover-single" />
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
    overflow: "hidden",
    backgroundColor: color.surface.card,
  },
  square: { borderRadius: radius.sm },
  round: { borderRadius: radius.full },
  mosaic: { flexDirection: "row", flexWrap: "wrap" },
  tile: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.accent.primary,
  },
  placeholder: { flex: 1, alignItems: "center", justifyContent: "center" },
});

// INFO: a cover: a 2 x 2 mosaic with four images, the first image with one to
// three, a placeholder with none; each image at the tier its drawn side
// needs (imageTier.ts); a square's corner is small or medium; with an icon, an accent tile with the
// glyph instead of images. Images are decorative.
import { Image, StyleSheet, View } from "react-native";

import { color } from "../tokens/color.ts";
import { radius } from "../tokens/radius.ts";
import { shadow } from "../tokens/shadow.ts";
import { layout } from "../tokens/spacing.ts";
import { Icon, type IconName } from "./Icon.tsx";
import { imageUri, type ImageTiers } from "./imageTier.ts";

const MOSAIC_SIZE = 4;

interface CoverProps {
  images: readonly ImageTiers[];
  shape: "square" | "round";
  corner?: "sm" | "md";
  size?: number;
  icon?: IconName | undefined;
  elevated?: boolean;
}

export function Cover({
  images,
  shape,
  corner = "sm",
  size = layout.carouselCard,
  icon,
  elevated = false,
}: CoverProps) {
  const first = images[0];
  const cell = { width: size / 2, height: size / 2 };
  const box = { width: size, height: size };

  const corners =
    shape === "round" ? styles.round : corner === "md" ? styles.squareMedium : styles.square;

  const art = (
    <View style={[styles.box, box, corners]}>
      {icon !== undefined ? (
        <View style={styles.tile} testID="cover-tile">
          <Icon name={icon} size="lg" tone="inverse" />
        </View>
      ) : images.length >= MOSAIC_SIZE ? (
        <View style={styles.mosaic} testID="cover-mosaic">
          {images.slice(0, MOSAIC_SIZE).map((image, index) => (
            <Image
              key={`${String(index)}:${image.small}`}
              source={{ uri: imageUri(image, size / 2) }}
              style={cell}
              accessible={false}
            />
          ))}
        </View>
      ) : first !== undefined ? (
        <Image
          source={{ uri: imageUri(first, size) }}
          style={box}
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

  // INFO: the clipping view cannot carry the shadow (it clips it too), so an
  // elevated cover wraps it in an unclipped view that holds the shadow.
  return elevated ? (
    <View style={[styles.shadowed, box, corners]} testID="cover-shadow">
      {art}
    </View>
  ) : (
    art
  );
}

const styles = StyleSheet.create({
  box: {
    overflow: "hidden",
    backgroundColor: color.surface.card,
  },
  shadowed: { ...shadow.cover, backgroundColor: color.surface.card },
  square: { borderRadius: radius.sm },
  squareMedium: { borderRadius: radius.md },
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

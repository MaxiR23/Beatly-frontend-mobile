// INFO: the only importer of expo-image; every image of the app is drawn with it: memory and disk cache, no transition on iOS, a fade on Android only for a picture loaded from the network (none from memory or disk), and a remote source's URL as its recycling key, so a reused or re-pointed view never shows the previous picture, the main cover of a screen at high priority, and the prefetch of a cover before it is drawn (ADR 029).
import { Image } from "expo-image";
import type { ImageStyle, StyleProp } from "react-native";

import { motion } from "../tokens/motion.ts";
import { imageUri, type ImageTiers } from "./imageTier.ts";
import { isAndroidVariant } from "./platform.ts";

// A remote picture by URL, or a bundled asset (the module id Metro gives a PNG import).
export type PictureSource = { readonly uri: string } | number;

interface PictureProps {
  source: PictureSource;
  style?: StyleProp<ImageStyle>;
  contentFit?: "cover" | "contain";
  priority?: "normal" | "high";
  accessible?: boolean;
  accessibilityIgnoresInvertColors?: boolean;
  testID?: string;
}

// Android only: a network load fades in; a memory or disk hit draws at once. iOS draws with no transition.
const androidTransition = { duration: motion.duration.imageFade, skipOnCacheHit: "all" } as const;

export function Picture({
  source,
  style,
  contentFit = "cover",
  priority = "normal",
  accessible,
  accessibilityIgnoresInvertColors,
  testID,
}: PictureProps) {
  const uri = typeof source === "number" ? null : source.uri;
  return (
    <Image
      source={source}
      style={style}
      contentFit={contentFit}
      cachePolicy="memory-disk"
      priority={priority}
      transition={isAndroidVariant() ? androidTransition : null}
      recyclingKey={uri}
      {...(accessible !== undefined && { accessible })}
      {...(accessibilityIgnoresInvertColors !== undefined && { accessibilityIgnoresInvertColors })}
      {...(testID !== undefined && { testID })}
    />
  );
}

// Fetches a cover into the memory and disk cache at the tier its drawn side needs, before any view draws it; resolves false when it fails.
export function prefetchPicture(image: ImageTiers, points: number): Promise<boolean> {
  return Image.prefetch(imageUri(image, points), { cachePolicy: "memory-disk" });
}

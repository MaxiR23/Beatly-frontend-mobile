// INFO: the mini player: a pill with a round cover on iOS below 26; on Android a rectangle with small corners, a square cover and filled play and next spacing.xs apart, pressed with the fade instead of the ripple, narrower than a control, at control height. A title that scrolls when it does not fit and a subtitle line, play or pause and next; tinted, with no progress line, or bare inside a surface the system draws (the iOS 26+ tab accessory); tapping the body opens the player.
import { Pressable, StyleSheet, View } from "react-native";

import { layout, spacing } from "../tokens/spacing.ts";
import { Cover } from "./Cover.tsx";
import { GlassSurface } from "./GlassSurface.tsx";
import { IconButton } from "./IconButton.tsx";
import type { ImageTiers } from "./imageTier.ts";
import { Marquee } from "./Marquee.tsx";
import { Text } from "./Text.tsx";
import { isAndroidVariant } from "./platform.ts";
import { pressFeedback } from "./pressFeedback.ts";

interface MiniPlayerProps {
  title: string;
  subtitle: string;
  failed: boolean;
  image: ImageTiers | null;
  tint: string | null;
  surface?: "glass" | "bare";
  playing: boolean;
  reduceMotion: boolean;
  busy: boolean;
  labels: { open: string; play: string; pause: string; next: string };
  onOpen: () => void;
  onToggle: () => void;
  onNext: () => void;
}

export function MiniPlayer({
  title,
  subtitle,
  failed,
  image,
  tint,
  surface = "glass",
  playing,
  reduceMotion,
  busy,
  labels,
  onOpen,
  onToggle,
  onNext,
}: MiniPlayerProps) {
  const android = isAndroidVariant();
  const press = pressFeedback({ shape: android ? "bounds" : "round" });

  const play = (
    <IconButton
      icon={playing ? "pause" : "play"}
      accessibilityLabel={playing ? labels.pause : labels.play}
      busy={busy}
      onPress={onToggle}
      {...(android ? { filled: true, narrow: true, androidPress: "fade" } : {})}
    />
  );
  const next = (
    <IconButton
      icon="skipForward"
      accessibilityLabel={labels.next}
      onPress={onNext}
      {...(android ? { filled: true, narrow: true, androidPress: "fade" } : {})}
    />
  );

  const children = (
    <>
      <Pressable
        android_ripple={press.android_ripple}
        accessibilityRole="button"
        accessibilityLabel={labels.open}
        onPress={onOpen}
        style={({ pressed }) => [styles.body, press.style(pressed)]}
      >
        <Cover
          images={image === null ? [] : [image]}
          shape={android ? "square" : "round"}
          size={layout.rowCover}
        />
        <View style={styles.text}>
          <Marquee text={title} variant="rowTitle" reduceMotion={reduceMotion} />
          <Text variant="meta" tone={failed ? "error" : "secondary"} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </Pressable>
      {android ? (
        <View style={styles.controls} testID="mini-player-controls">
          {play}
          {next}
        </View>
      ) : (
        <>
          {play}
          {next}
        </>
      )}
    </>
  );
  return surface === "bare" ? (
    <View style={styles.bare} testID="mini-player">
      {children}
    </View>
  ) : (
    <GlassSurface
      variant={android ? "barRect" : "bar"}
      tint={tint}
      reduceMotion={reduceMotion}
      testID="mini-player"
    >
      {children}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  bare: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xs,
    gap: spacing.xs,
    overflow: "hidden",
  },
  body: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: layout.gap,
    paddingHorizontal: spacing.xs,
  },
  controls: { flexDirection: "row", gap: spacing.xs },
  text: { flex: 1, gap: spacing.xxs },
});

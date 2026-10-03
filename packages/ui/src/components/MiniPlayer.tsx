// INFO: the mini player pill: a round cover, a title that scrolls when it does not fit and a subtitle line, play or pause and next; tinted, with no progress line, or bare inside a surface the system draws (the iOS 26+ tab accessory); tapping the body opens the player.
import { Pressable, StyleSheet, View } from "react-native";

import { motion } from "../tokens/motion.ts";
import { layout, spacing } from "../tokens/spacing.ts";
import { Cover } from "./Cover.tsx";
import { GlassSurface } from "./GlassSurface.tsx";
import { IconButton } from "./IconButton.tsx";
import { Marquee } from "./Marquee.tsx";
import { Text } from "./Text.tsx";

interface MiniPlayerProps {
  title: string;
  subtitle: string;
  failed: boolean;
  coverUrl: string | null;
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
  coverUrl,
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
  const children = (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={labels.open}
        onPress={onOpen}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
      >
        <Cover urls={coverUrl === null ? [] : [coverUrl]} shape="round" size={layout.rowCover} />
        <View style={styles.text}>
          <Marquee text={title} variant="rowTitle" reduceMotion={reduceMotion} />
          <Text variant="meta" tone={failed ? "error" : "secondary"} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </Pressable>
      <IconButton
        icon={playing ? "pause" : "play"}
        accessibilityLabel={playing ? labels.pause : labels.play}
        busy={busy}
        onPress={onToggle}
      />
      <IconButton icon="skipForward" accessibilityLabel={labels.next} onPress={onNext} />
    </>
  );
  return surface === "bare" ? (
    <View style={styles.bare} testID="mini-player">
      {children}
    </View>
  ) : (
    <GlassSurface variant="bar" tint={tint} testID="mini-player">
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
  pressed: { opacity: motion.pressOpacity },
  text: { flex: 1, gap: spacing.xxs },
});

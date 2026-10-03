// INFO: the player's up next, lyrics and related sheet over PullUpSheet: the song row (its title scrolls when it does not fit) that closes it, play or pause, the three options and the selected tab's body, mounted from the moment the sheet starts opening (a drag on the handle or open) until its close ends, so it is drawn while the sheet moves and each tab loads only once shown; nudges the handle the first openings.
import { layout, spacing } from "@beatly/ui";
import { Cover, IconButton, Marquee, PullUpSheet, SegmentedControl, Text } from "@beatly/ui/native";
import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useT } from "../../adapters/i18n.ts";
import { useSheetNudge } from "../../queries/useSheetNudge.ts";
import { LyricsTab } from "./LyricsTab.tsx";
import { RelatedTab } from "./RelatedTab.tsx";
import { UpNextTab } from "./UpNextTab.tsx";
import { usePlayback, usePlaybackActions } from "./usePlayback.ts";

type Tab = "upNext" | "lyrics" | "related";

interface PlayerSheetProps {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  reduceMotion: boolean;
  wash: string | null;
  onOpenAlbum: (id: string) => void;
  onOpenArtist: (id: string) => void;
  children: ReactNode;
}

export function PlayerSheet({
  open,
  onOpen,
  onClose,
  reduceMotion,
  wash,
  onOpenAlbum,
  onOpenArtist,
  children,
}: PlayerSheetProps) {
  const t = useT("player");
  const insets = useSafeAreaInsets();
  const playback = usePlaybackActions();
  const current = usePlayback((s) => s.current);
  const status = usePlayback((s) => s.status);
  const nudge = useSheetNudge();
  const [tab, setTab] = useState<Tab>("upNext");
  const [bodyAtTop, setBodyAtTop] = useState(true);
  const [warm, setWarm] = useState(false);
  if (open && !warm) setWarm(true);

  if (current === null) return <>{children}</>;

  const options = [
    { key: "upNext", label: t("sheet.tabs.upNext") },
    { key: "lyrics", label: t("sheet.tabs.lyrics") },
    { key: "related", label: t("sheet.tabs.related") },
  ] as const;

  const header = (
    <View>
      <View style={styles.songRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("sheet.close")}
          onPress={onClose}
          style={styles.song}
          testID="player-sheet-song"
        >
          <Cover
            urls={current.coverUrl === null ? [] : [current.coverUrl]}
            shape="square"
            size={layout.rowCoverMedium}
          />
          <View style={styles.titles}>
            <Marquee text={current.title} variant="title" reduceMotion={reduceMotion} />
            <Text tone="secondary" numberOfLines={1}>
              {current.artists.map((artist) => artist.name).join(t("artistSeparator"))}
            </Text>
          </View>
        </Pressable>
        <IconButton
          variant="primaryCompact"
          icon={status === "playing" ? "pause" : "play"}
          accessibilityLabel={status === "playing" ? t("pause") : t("play")}
          busy={status === "loading"}
          onPress={() => {
            void playback.toggle();
          }}
        />
      </View>
      <View style={styles.tabs}>
        <SegmentedControl
          options={options}
          selected={tab}
          onChange={(next) => {
            setTab(next);
            setBodyAtTop(true);
          }}
          testID="player-sheet-tabs"
        />
      </View>
    </View>
  );

  let body: ReactNode = null;
  if (open || warm) {
    if (tab === "upNext") {
      body = <UpNextTab trackId={current.trackId} onAtTopChange={setBodyAtTop} />;
    } else if (tab === "lyrics") {
      body = <LyricsTab trackId={current.trackId} onAtTopChange={setBodyAtTop} />;
    } else {
      body = (
        <RelatedTab
          trackId={current.trackId}
          onAtTopChange={setBodyAtTop}
          onOpenAlbum={onOpenAlbum}
          onOpenArtist={onOpenArtist}
        />
      );
    }
  }

  return (
    <PullUpSheet
      testID="player-sheet"
      open={open}
      onOpen={onOpen}
      onClose={onClose}
      onDragStart={() => {
        setWarm(true);
      }}
      onClosed={() => {
        setWarm(false);
      }}
      reduceMotion={reduceMotion}
      nudge={nudge}
      handleLabel={t("sheet.open")}
      topInset={insets.top}
      bottomInset={insets.bottom}
      washColor={wash}
      header={header}
      body={<View style={styles.body}>{body}</View>}
      bodyAtTop={bodyAtTop}
    >
      {children}
    </PullUpSheet>
  );
}

const styles = StyleSheet.create({
  songRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: layout.gutter,
    paddingTop: spacing.lg,
    gap: layout.gap,
  },
  song: { flex: 1, flexDirection: "row", alignItems: "center", gap: layout.gap },
  titles: { flex: 1, gap: spacing.xxs },
  tabs: { paddingHorizontal: layout.gutter, paddingTop: spacing.lg },
  body: { flex: 1, marginTop: spacing.md },
});

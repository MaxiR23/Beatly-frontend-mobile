// INFO: the lyrics tab of the player sheet, from GET /tracks/{id}/lyrics: synced lyrics follow the song (the playing line in the primary tone, centered, a press seeks to its start), plain lyrics are drawn as they come, lyrics null or without lines draw the empty state.
import { layout, spacing } from "@beatly/ui";
import { EmptyState, ErrorState, LoadingState, Text } from "@beatly/ui/native";
import type { LyricsLine } from "@beatly/core";
import { useEffect, useRef } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet } from "react-native";

import { useT } from "../../adapters/i18n.ts";
import { useLyrics } from "../../queries/useTracks.ts";
import { currentLineIndex } from "./lyricsLine.ts";
import { usePlayback, usePlaybackActions } from "./usePlayback.ts";
import { useReduceMotion } from "./useReduceMotion.ts";

interface LyricsTabProps {
  trackId: string;
  onAtTopChange: (atTop: boolean) => void;
}

export function LyricsTab({ trackId, onAtTopChange }: LyricsTabProps) {
  const t = useT("player");
  const tc = useT("common");
  const playback = usePlaybackActions();
  const reduceMotion = useReduceMotion();
  const position = usePlayback((s) => s.positionSeconds);
  const lyrics = useLyrics(trackId);
  const listRef = useRef<FlatList<LyricsLine>>(null);

  const data = lyrics.data?.lyrics ?? null;
  const lines = data === null ? [] : data.lines;
  const active = data?.has_timestamps === true ? currentLineIndex(lines, position * 1000) : -1;

  useEffect(() => {
    if (active < 0) return;
    listRef.current?.scrollToIndex({ index: active, viewPosition: 0.5, animated: !reduceMotion });
  }, [active, reduceMotion]);

  const listed = !lyrics.isPending && !lyrics.isError && lines.length > 0;
  useEffect(() => {
    if (listed) onAtTopChange(true);
  }, [listed, trackId, onAtTopChange]);

  const onScroll = (offset: number) => {
    onAtTopChange(offset <= 0);
  };

  if (lyrics.isPending) return <LoadingState label={tc("loading")} />;
  if (lyrics.isError) {
    return (
      <ErrorState
        message={tc("error.generic")}
        retryLabel={tc("retry")}
        onRetry={() => void lyrics.refetch()}
      />
    );
  }
  if (data === null || lines.length === 0) {
    return <EmptyState icon="music" message={t("sheet.lyricsEmpty")} />;
  }
  if (!data.has_timestamps) {
    return (
      <ScrollView
        onScroll={(event) => {
          onScroll(event.nativeEvent.contentOffset.y);
        }}
        contentContainerStyle={styles.plain}
        testID="player-sheet-lyrics"
      >
        {lines.map((line, index) => (
          <Text key={`${String(index)}:${line.text}`} variant="title">
            {line.text}
          </Text>
        ))}
      </ScrollView>
    );
  }
  return (
    <FlatList
      ref={listRef}
      data={lines}
      keyExtractor={(line, index) => `${String(index)}:${line.text}`}
      onScroll={(event) => {
        onScroll(event.nativeEvent.contentOffset.y);
      }}
      onScrollToIndexFailed={(info) => {
        listRef.current?.scrollToOffset({
          offset: info.averageItemLength * info.index,
          animated: false,
        });
      }}
      renderItem={({ item, index }) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={item.text}
          onPress={() => {
            if (item.start_ms !== null) void playback.seek(item.start_ms / 1000);
          }}
          style={styles.line}
        >
          <Text variant="title" tone={index === active ? "primary" : "tertiary"}>
            {item.text}
          </Text>
        </Pressable>
      )}
      testID="player-sheet-lyrics"
    />
  );
}

const styles = StyleSheet.create({
  line: { paddingHorizontal: layout.gutter, paddingVertical: spacing.sm },
  plain: { paddingHorizontal: layout.gutter, gap: spacing.md },
});

// INFO: the related tab of the player sheet, from GET /tracks/{id}/related: the songs (a press plays them from it), the artists and the albums (a press opens them); an empty section is hidden and three empty lists draw the empty state.
import type { AlbumRef, RelatedArtist } from "@beatly/core";
import { layout, spacing } from "@beatly/ui";
import {
  Carousel,
  EmptyState,
  ErrorState,
  LoadingState,
  MediaRow,
  Text,
  type CarouselItem,
} from "@beatly/ui/native";
import { useEffect } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { useT } from "../../adapters/i18n.ts";
import { useRelated } from "../../queries/useTracks.ts";
import { playableOf } from "./queue.ts";
import { usePlayback, usePlaybackActions } from "./usePlayback.ts";

interface RelatedTabProps {
  trackId: string;
  onAtTopChange: (atTop: boolean) => void;
  onOpenAlbum: (id: string) => void;
  onOpenArtist: (id: string) => void;
}

const urlsOf = (url: string | null): string[] => (url === null ? [] : [url]);

export function RelatedTab({ trackId, onAtTopChange, onOpenAlbum, onOpenArtist }: RelatedTabProps) {
  const t = useT("player");
  const tc = useT("common");
  const playback = usePlaybackActions();
  const current = usePlayback((s) => s.current);
  const related = useRelated(trackId);
  const listed =
    related.data !== undefined &&
    (related.data.songs.length > 0 ||
      related.data.artists.length > 0 ||
      related.data.albums.length > 0);

  useEffect(() => {
    if (listed) onAtTopChange(true);
  }, [listed, trackId, onAtTopChange]);

  if (related.isPending) return <LoadingState label={tc("loading")} />;
  if (related.isError) {
    return (
      <ErrorState
        message={tc("error.generic")}
        retryLabel={tc("retry")}
        onRetry={() => void related.refetch()}
      />
    );
  }
  const { songs, artists, albums } = related.data;
  if (songs.length === 0 && artists.length === 0 && albums.length === 0) {
    return <EmptyState icon="music" message={t("sheet.relatedEmpty")} />;
  }

  const playable = songs.map(playableOf);
  const artistItem = (artist: RelatedArtist): CarouselItem => ({
    key: artist.id,
    title: artist.name,
    urls: urlsOf(artist.thumbnail_url),
    shape: "round",
    onPress: () => {
      onOpenArtist(artist.id);
    },
  });
  const albumItem = (album: AlbumRef): CarouselItem => ({
    key: album.id,
    title: album.title,
    subtitle: album.year ?? undefined,
    urls: urlsOf(album.thumbnail_url),
    shape: "square",
    onPress: () => {
      onOpenAlbum(album.id);
    },
  });

  return (
    <ScrollView
      onScroll={(event) => {
        onAtTopChange(event.nativeEvent.contentOffset.y <= 0);
      }}
      contentContainerStyle={styles.sections}
      testID="player-sheet-related"
    >
      {songs.length > 0 ? (
        <View style={styles.songs} testID="player-sheet-related-songs">
          <View style={styles.sectionHeader}>
            <Text variant="section">{t("sheet.songs")}</Text>
          </View>
          {songs.map((song, position) => (
            <MediaRow
              key={`${String(position)}:${song.track_id}`}
              shape="square"
              urls={urlsOf(song.thumbnail_url)}
              title={song.title}
              subtitle={song.artists.map((a) => a.name).join(t("artistSeparator"))}
              onPress={() => {
                if (current !== null) {
                  void playback.playList(playable, position, {
                    kind: "track",
                    id: current.trackId,
                    name: current.title,
                  });
                }
              }}
            />
          ))}
        </View>
      ) : null}
      {artists.length > 0 ? (
        <Carousel
          testID="player-sheet-related-artists"
          title={t("sheet.artists")}
          items={artists.map(artistItem)}
        />
      ) : null}
      {albums.length > 0 ? (
        <Carousel
          testID="player-sheet-related-albums"
          title={t("sheet.albums")}
          items={albums.map(albumItem)}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sections: { gap: spacing.xl },
  songs: { gap: spacing.md },
  sectionHeader: { paddingHorizontal: layout.gutter },
});

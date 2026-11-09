// INFO: the related tab of the player sheet, from GET /tracks/{id}/related: the songs (a press plays them from it), the artists and the albums (a press opens them); an empty section is hidden and three empty lists draw the empty state; every song row ends with the track menu button and the current track's row is marked.
import type { AlbumRef, ImageTiers, RelatedArtist } from "@beatly/core";
import { spacing } from "@beatly/ui";
import {
  Carousel,
  EmptyState,
  LoadingState,
  MediaRow,
  RowSection,
  type CarouselItem,
} from "@beatly/ui/native";
import { useEffect } from "react";
import { ScrollView, StyleSheet } from "react-native";

import { useT } from "../../adapters/i18n.ts";
import { queryFailure } from "../../queries/failureCause.ts";
import { useRelated } from "../../queries/useTracks.ts";
import { FailureState } from "../failure/FailureState.tsx";
import { TrackMenuButton } from "../trackMenu/TrackMenuButton.tsx";
import { playableOf } from "./queue.ts";
import { useNowPlaying } from "./useNowPlaying.ts";
import { usePlayback, usePlaybackActions } from "./usePlayback.ts";

interface RelatedTabProps {
  trackId: string;
  onAtTopChange: (atTop: boolean) => void;
  onOpenAlbum: (id: string) => void;
  onOpenArtist: (id: string) => void;
}

const imagesOf = (image: ImageTiers | null): ImageTiers[] => (image === null ? [] : [image]);

export function RelatedTab({ trackId, onAtTopChange, onOpenAlbum, onOpenArtist }: RelatedTabProps) {
  const t = useT("player");
  const tc = useT("common");
  const playback = usePlaybackActions();
  const nowPlaying = useNowPlaying();
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

  const failure = queryFailure(related);
  if (failure !== null) {
    return <FailureState cause={failure} onRetry={() => void related.refetch()} />;
  }
  if (!related.isSuccess) return <LoadingState label={tc("loading")} />;
  const { songs, artists, albums } = related.data;
  if (songs.length === 0 && artists.length === 0 && albums.length === 0) {
    return <EmptyState icon="music" message={t("sheet.relatedEmpty")} />;
  }

  const playable = songs.map(playableOf);
  const artistItem = (artist: RelatedArtist): CarouselItem => ({
    key: artist.id,
    title: artist.name,
    images: imagesOf(artist.image),
    shape: "round",
    onPress: () => {
      onOpenArtist(artist.id);
    },
  });
  const albumItem = (album: AlbumRef): CarouselItem => ({
    key: album.id,
    title: album.title,
    subtitle: album.year ?? undefined,
    images: imagesOf(album.image),
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
        <RowSection title={t("sheet.songs")} testID="player-sheet-related-songs">
          {songs.map((song, position) => (
            <MediaRow
              key={`${String(position)}:${song.track_id}`}
              shape="square"
              images={imagesOf(song.image)}
              title={song.title}
              subtitle={song.artists.map((a) => a.name).join(t("artistSeparator"))}
              nowPlaying={nowPlaying.of(song.track_id)}
              reduceMotion={nowPlaying.reduceMotion}
              trailing={<TrackMenuButton track={playable[position] ?? playableOf(song)} />}
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
        </RowSection>
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
});

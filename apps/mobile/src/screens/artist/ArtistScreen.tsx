// INFO: an artist: the detail base with a full-width image hero and the name over it, then popular songs, albums, singles and EPs and similar artists, each hidden when empty; unavailable for an invalid id.
import type { AlbumRef } from "@beatly/core";
import { layout, spacing } from "@beatly/ui";
import {
  Carousel,
  DetailScreen,
  MediaRow,
  Text,
  type CarouselItem,
  type DetailBody,
} from "@beatly/ui/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useT } from "../../adapters/i18n.ts";
import { OutcomeError } from "../../queries/outcomeError.ts";
import { useArtist } from "../../queries/useArtist.ts";
import { singleMeta } from "./singleMeta.ts";
import { toQueue } from "../player/queue.ts";
import { usePlaybackActions } from "../player/usePlayback.ts";
import { useTabBarClearance } from "../player/useTabBarClearance.ts";

const urlsOf = (url: string | null): string[] => (url === null ? [] : [url]);

export function ArtistScreen() {
  const t = useT("artist");
  const tc = useT("common");
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarClearance = useTabBarClearance();
  const playback = usePlaybackActions();
  const { id = "" } = useLocalSearchParams<{ id?: string }>();
  const artist = useArtist(id);

  function goBack() {
    // A deep link has nothing to go back to, so it lands on home.
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  const openAlbum = (albumId: string) => () => {
    router.push({ pathname: "/album/[id]", params: { id: albumId } });
  };

  const albumItem = (ref: AlbumRef): CarouselItem => ({
    key: ref.id,
    title: ref.title,
    subtitle: ref.year ?? undefined,
    urls: urlsOf(ref.thumbnail_url),
    shape: "square",
    onPress: openAlbum(ref.id),
  });

  const unavailable =
    artist.error instanceof OutcomeError &&
    artist.error.outcome.kind === "api_failure" &&
    artist.error.outcome.reason === "invalid_request";

  let body: DetailBody;
  if (artist.isPending) {
    body = { kind: "loading", label: tc("loading"), hero: "image" };
  } else if (unavailable) {
    body = { kind: "unavailable", message: t("notAvailable") };
  } else if (artist.isError) {
    body = {
      kind: "error",
      message: tc("error.generic"),
      retryLabel: tc("retry"),
      onRetry: () => void artist.refetch(),
    };
  } else {
    const data = artist.data;
    const playSong = (tapped: number) => {
      const queue = toQueue(data.songs, tapped, (song) =>
        song.track_id === null
          ? null
          : {
              trackId: song.track_id,
              title: song.title,
              artists: song.artists.length > 0 ? song.artists.map((a) => a.name) : [data.name],
              coverUrl: song.thumbnail_url,
              durationSeconds: song.duration_seconds,
            },
      );
      if (queue !== null) {
        void playback.playList(queue.tracks, queue.index, {
          kind: "artist",
          id: data.id,
          name: data.name,
        });
      }
    };
    body = {
      kind: "ready",
      hero: "image",
      title: data.name,
      cover: { urls: urlsOf(data.thumbnail_url) },
      washColor: null,
      children: (
        <View style={styles.sections} testID="artist-sections">
          {data.songs.length > 0 ? (
            <View style={styles.songs} testID="artist-popular">
              <View style={styles.sectionHeader}>
                <Text variant="section">{t("popular")}</Text>
              </View>
              {data.songs.map((song, index) => (
                <MediaRow
                  key={`${String(index)}:${song.track_id ?? song.title}`}
                  shape="square"
                  urls={urlsOf(song.thumbnail_url)}
                  title={song.title}
                  subtitle={song.album ?? undefined}
                  available={song.track_id !== null}
                  onPress={
                    song.track_id === null
                      ? undefined
                      : () => {
                          playSong(index);
                        }
                  }
                />
              ))}
            </View>
          ) : null}
          {data.albums.length > 0 ? (
            <Carousel
              testID="artist-albums"
              title={t("albums")}
              items={data.albums.map(albumItem)}
            />
          ) : null}
          {data.singles.length > 0 ? (
            <Carousel
              testID="artist-singles"
              title={t("singles")}
              items={data.singles.map((single): CarouselItem => ({
                key: single.id,
                title: single.title,
                subtitle: singleMeta(single, t),
                urls: urlsOf(single.thumbnail_url),
                shape: "square",
                onPress: openAlbum(single.id),
              }))}
            />
          ) : null}
          {data.related.length > 0 ? (
            <Carousel
              testID="artist-similar"
              title={t("similar")}
              items={data.related.map((related): CarouselItem => ({
                key: related.id,
                title: related.name,
                urls: urlsOf(related.thumbnail_url),
                shape: "round",
                onPress: () => {
                  router.push({ pathname: "/artist/[id]", params: { id: related.id } });
                },
              }))}
            />
          ) : null}
        </View>
      ),
    };
  }

  return (
    <DetailScreen
      testID="artist"
      body={body}
      backLabel={t("back")}
      onBack={goBack}
      topInset={insets.top}
      bottomInset={tabBarClearance}
    />
  );
}

const styles = StyleSheet.create({
  sections: { gap: spacing.xl },
  songs: { gap: spacing.md },
  sectionHeader: { paddingHorizontal: layout.gutter },
});

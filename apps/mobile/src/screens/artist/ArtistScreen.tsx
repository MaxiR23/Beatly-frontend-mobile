// INFO: an artist: the detail base with a full-width image hero and the name over it, then popular songs (rows of the detail base under their title), albums, singles and EPs and similar artists (the carousels being the slot after the rows), each hidden when empty, every playable popular song with a menu button, a song without a track id dimmed, unpressable, without menu, and announced as not available; unavailable for an invalid id; the current track's row is marked; starting a list registers it as a recent.
import type { AlbumRef, Artist, ImageTiers, PlayableTrack } from "@beatly/core";
import { layout, spacing } from "@beatly/ui";
import {
  Carousel,
  DetailScreen,
  MediaRow,
  Text,
  type CarouselItem,
  type DetailBody,
  type DetailRow,
} from "@beatly/ui/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useT } from "../../adapters/i18n.ts";
import { OutcomeError } from "../../queries/outcomeError.ts";
import { useArtist } from "../../queries/useArtist.ts";
import { useRegisterRecent } from "../../queries/useRecents.ts";
import { singleMeta } from "./singleMeta.ts";
import { toQueue } from "../player/queue.ts";
import { useNowPlaying } from "../player/useNowPlaying.ts";
import { usePlaybackActions } from "../player/usePlayback.ts";
import { useTabBarClearance } from "../player/useTabBarClearance.ts";
import { TrackMenuButton } from "../trackMenu/TrackMenuButton.tsx";
import { TrackMenuHost } from "../trackMenu/TrackMenuHost.tsx";

const imagesOf = (image: ImageTiers | null): ImageTiers[] => (image === null ? [] : [image]);

type ArtistSong = Artist["songs"][number];

// The song as playback and the menu see it: null when it has no track id.
function toPlayable(song: ArtistSong): PlayableTrack | null {
  if (song.track_id === null) return null;
  return {
    trackId: song.track_id,
    title: song.title,
    artists: song.artists,
    album: song.album,
    albumId: song.album_id,
    coverUrl: song.thumbnail_url,
    image: song.image,
    durationSeconds: song.duration_seconds,
  };
}

export function ArtistScreen() {
  const t = useT("artist");
  const tc = useT("common");
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarClearance = useTabBarClearance();
  const playback = usePlaybackActions();
  const registerRecent = useRegisterRecent();
  const { id = "" } = useLocalSearchParams<{ id?: string }>();
  const artist = useArtist(id);
  const nowPlaying = useNowPlaying();

  function goBack() {
    // A deep link has nothing to go back to, so it lands on home.
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  const openAlbumId = (albumId: string) => {
    router.push({ pathname: "/album/[id]", params: { id: albumId } });
  };
  const openAlbum = (albumId: string) => () => {
    openAlbumId(albumId);
  };

  const albumItem = (ref: AlbumRef): CarouselItem => ({
    key: ref.id,
    title: ref.title,
    subtitle: ref.year ?? undefined,
    images: imagesOf(ref.image),
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
      const queue = toQueue(data.songs, tapped, (song) => toPlayable(song));
      if (queue !== null) {
        void playback.playList(queue.tracks, queue.index, {
          kind: "artist",
          id: data.id,
          name: data.name,
        });
        registerRecent.mutate({
          entity_type: "artist",
          entity_id: data.id,
          metadata: { title: data.name, subtitle: null, thumbnail_url: data.thumbnail_url },
        });
      }
    };
    const rows: DetailRow[] = data.songs.map((song, index) => {
      const playable = toPlayable(song);
      return {
        key: `${String(index)}:${song.track_id ?? song.title}`,
        element: (
          <View style={styles.song} testID="artist-song">
            <MediaRow
              shape="square"
              images={imagesOf(song.image)}
              title={song.title}
              subtitle={song.album ?? undefined}
              available={playable !== null}
              unavailableLabel={t("trackUnavailable", { title: song.title })}
              nowPlaying={nowPlaying.of(playable?.trackId ?? null)}
              reduceMotion={nowPlaying.reduceMotion}
              trailing={playable !== null ? <TrackMenuButton track={playable} /> : undefined}
              onPress={
                playable !== null
                  ? () => {
                      playSong(index);
                    }
                  : undefined
              }
            />
          </View>
        ),
      };
    });
    const hasCarousels =
      data.albums.length > 0 || data.singles.length > 0 || data.related.length > 0;
    body = {
      kind: "ready",
      hero: "image",
      title: data.name,
      cover: { images: imagesOf(data.image) },
      washColor: null,
      children:
        data.songs.length > 0 ? (
          <View style={styles.sectionHeader} testID="artist-popular">
            <Text variant="section">{t("popular")}</Text>
          </View>
        ) : null,
      rows,
      afterRows: hasCarousels ? (
        <View
          style={[styles.sections, data.songs.length > 0 ? styles.afterSongs : null]}
          testID="artist-sections"
        >
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
                images: imagesOf(single.image),
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
                images: imagesOf(related.image),
                shape: "round",
                onPress: () => {
                  router.push({ pathname: "/artist/[id]", params: { id: related.id } });
                },
              }))}
            />
          ) : null}
        </View>
      ) : undefined,
    };
  }

  return (
    <TrackMenuHost
      onOpenArtist={(artistId) => {
        router.push({ pathname: "/artist/[id]", params: { id: artistId } });
      }}
      onOpenAlbum={openAlbumId}
      bottomInset={tabBarClearance}
    >
      <DetailScreen
        reduceMotion={nowPlaying.reduceMotion}
        testID="artist"
        body={body}
        backLabel={t("back")}
        onBack={goBack}
        topInset={insets.top}
        bottomInset={tabBarClearance}
      />
    </TrackMenuHost>
  );
}

const styles = StyleSheet.create({
  sections: { gap: spacing.xl },
  // The popular title and the songs keep their spacing.md column gap; the carousels keep spacing.xl after the last song.
  afterSongs: { paddingTop: spacing.xl },
  song: { paddingTop: spacing.md },
  sectionHeader: { paddingHorizontal: layout.gutter },
});
